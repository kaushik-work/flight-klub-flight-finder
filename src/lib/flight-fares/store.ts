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
    { $group: { _id: { o: "$originSlug", d: "$destinationSlug" }, avg: { $avg: "$price" }, n: { $sum: 1 }, best: { $first: "$$ROOT" } } },
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

// Public wrappers: a database blip must not 500 a page, so failures become "no fares right now".
export async function getOriginRows(origin: string): Promise<Row[]> {
  try { return await loadOrigin(origin); } catch { return []; }
}
export async function getRoutes(): Promise<Route[]> {
  try { return await loadRoutes(); } catch { return []; }
}
export async function getMonthMins(): Promise<{ month: string; from: number }[]> {
  try { return await loadMonths(); } catch { return []; }
}

/** Destinations present in the data, so new ones (for example Goa) appear without a code change. */
export async function getDestinations(): Promise<{ slug: string; city: string; intl: boolean }[]> {
  const routes = await getRoutes();
  const seen = new Map<string, { slug: string; city: string; intl: boolean }>();
  for (const r of routes) if (!seen.has(r.d)) seen.set(r.d, { slug: r.d, city: r.city, intl: r.intl });
  return [...seen.values()].sort((a, b) => a.city.localeCompare(b.city));
}
