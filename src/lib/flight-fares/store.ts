import { MongoClient, type Db } from "mongodb";
import { cacheLife, cacheTag } from "next/cache";
import type { Route, Row } from "@/lib/fares";

// Read-only access to the fares the scraper writes to Mongo (database "flightklub", collection "flight_fares").
// Nothing here writes, and nothing invents a price: on any failure the callers get an empty list.

const COLLECTION = "flight_fares";
const DB_NAME = process.env.FARES_MONGODB_DB_NAME || "flightklub";

declare global {
  var _faresMongo: Promise<MongoClient> | undefined;
}

export const FARES_COLLECTION = COLLECTION;

export async function getFaresDb(): Promise<Db> {
  const uri = process.env.FLIGHT_FINDER_MONGO_URI;
  if (!uri) throw new Error("FLIGHT_FINDER_MONGO_URI is not set");
  global._faresMongo ??= new MongoClient(uri, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 45000, maxPoolSize: 3 }).connect();
  return (await global._faresMongo).db(DB_NAME);
}

const title = (s: string) => s.split("-").map((p) => p[0]?.toUpperCase() + p.slice(1)).join(" ");

type Doc = {
  id?: string; destinationSlug?: string; originSlug?: string;
  destination?: { city?: string; code?: string; country?: string };
  departureDate?: string; returnDate?: string; departureMonth?: string; nights?: number; price?: number;
  outbound?: { airlineName?: string; stops?: number | null; durationMinutes?: number | null };
  retrievedAt?: string;
  baggage?: { airline?: string; url?: string }[];
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function base(f: Doc) {
  return {
    d: f.destinationSlug ?? "",
    city: f.destination?.city || title(f.destinationSlug ?? ""),
    code: f.destination?.code ?? "",
    country: f.destination?.country ?? "",
    intl: f.destination?.country !== "India",
    dep: f.departureDate ?? "",
    ret: f.returnDate ?? "",
    month: f.departureMonth ?? "",
    nights: f.nights ?? 0,
    price: f.price ?? 0,
    airline: f.outbound?.airlineName ?? "",
    stops: num(f.outbound?.stops),
    mins: num(f.outbound?.durationMinutes),
    seen: f.retrievedAt ?? "",
  };
}

const usable = (f: Doc) => typeof f.price === "number" && f.price > 0 && !!f.departureDate && !!f.destinationSlug;

async function loadOrigin(origin: string): Promise<Row[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  cacheTag("flight-fares");
  const docs = (await (await getFaresDb()).collection(COLLECTION).find({ originSlug: origin }).sort({ price: 1 }).limit(3000).toArray()) as unknown as Doc[];
  return docs.filter(usable).map((f) => ({ id: f.id ?? `${origin}-${f.destinationSlug}-${f.departureDate}-${f.nights}`, ...base(f) }));
}

async function loadRoutes(): Promise<Route[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  cacheTag("flight-fares");
  const out = await (await getFaresDb()).collection(COLLECTION).aggregate([
    { $match: { price: { $gt: 0 } } },
    { $sort: { price: 1 } },
    // Average per trip length first: a 3-night fare compared with an average that includes 7-night trips looks
    // like a bigger saving than it is. "Below average" means below the same trip length on the same route.
    { $group: { _id: { o: "$originSlug", d: "$destinationSlug", nights: "$nights" }, avg: { $avg: "$price" }, n: { $sum: 1 }, best: { $first: "$$ROOT" } } },
    { $sort: { "best.price": 1 } },
    { $group: { _id: { o: "$_id.o", d: "$_id.d" }, avg: { $first: "$avg" }, n: { $first: "$n" }, best: { $first: "$best" } } },
  ]).toArray();
  return out.map((g) => ({ o: g._id.o as string, avg: Math.round(g.avg as number), n: g.n as number, ...base(g.best as Doc) }));
}

async function loadMonths(): Promise<{ month: string; from: number }[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  cacheTag("flight-fares");
  const out = await (await getFaresDb()).collection(COLLECTION).aggregate([
    { $match: { price: { $gt: 0 }, "destination.country": { $ne: "India" } } },
    { $group: { _id: "$departureMonth", from: { $min: "$price" } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  return out.map((m) => ({ month: m._id as string, from: m.from as number }));
}

async function loadNights(): Promise<number[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  cacheTag("flight-fares");
  const out = await (await getFaresDb()).collection(COLLECTION).aggregate([
    { $match: { price: { $gt: 0 } } },
    { $group: { _id: "$nights", n: { $sum: 1 } } },
    { $match: { n: { $gte: 50 } } }, // a length needs real coverage before it is offered as a choice
    { $sort: { _id: 1 } },
  ]).toArray();
  return out.map((g) => g._id as number).filter((n) => Number.isInteger(n) && n > 0);
}

async function loadBaggage(): Promise<Record<string, string>> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 21600, expire: 86400 });
  cacheTag("flight-fares");
  const docs = (await (await getFaresDb()).collection(COLLECTION).find({ "baggage.0": { $exists: true } }, { projection: { baggage: 1 } }).limit(4000).toArray()) as unknown as Doc[];
  const out: Record<string, string> = {};
  for (const d of docs) for (const b of d.baggage ?? []) if (b.airline && b.url?.startsWith("https://") && !out[b.airline]) out[b.airline] = b.url;
  return out;
}

// Public wrappers: a database blip must not 500 a page, so failures become "no fares right now".
export async function getOriginRows(origin: string): Promise<Row[]> {
  try { return await loadOrigin(origin); } catch { return []; }
}
export async function getRoutes(): Promise<Route[]> {
  try { return await loadRoutes(); } catch { return []; }
}
/** Trip lengths (in nights) we really hold fares for, so 4N and 6N appear by themselves once the scraper has collected them. */
export async function getNightOptions(): Promise<number[]> {
  try {
    const n = await loadNights();
    return n.length ? n : [3, 5, 7];
  } catch { return [3, 5, 7]; }
}
export async function getMonthMins(): Promise<{ month: string; from: number }[]> {
  try { return await loadMonths(); } catch { return []; }
}

/** Destinations present in the data, so new ones (for example Goa) appear without a code change. */
export async function getDestinations(): Promise<{ slug: string; city: string; country: string; intl: boolean }[]> {
  const routes = await getRoutes();
  const seen = new Map<string, { slug: string; city: string; country: string; intl: boolean }>();
  for (const r of routes) if (!seen.has(r.d)) seen.set(r.d, { slug: r.d, city: r.city, country: r.country, intl: r.intl });
  return [...seen.values()].sort((a, b) => a.city.localeCompare(b.city));
}

/** Airline name to its own baggage-allowance page, as listed by Google Flights. Empty until the scraper has collected them. */
export async function getBaggageLinks(): Promise<Record<string, string>> {
  try { return await loadBaggage(); } catch { return {}; }
}
