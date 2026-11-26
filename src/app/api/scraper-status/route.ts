import { createHash, timingSafeEqual } from "node:crypto";
import { type NextRequest } from "next/server";
import { getFaresDb } from "@/lib/flight-fares/store";

// Progress reports from the scraper droplets, shown on the admin Fares screen.
//   POST  x-fare-secret: <FARE_INGEST_SECRET>   { host, state, cities[], city, done, total, destination, … }
// One document per droplet in "scraper_status", overwritten by each report. Same secret as the fare ingest.

function secretMatches(given: string | null): boolean {
  const expected = process.env.FARE_INGEST_SECRET;
  if (!expected || !given) return false;
  return timingSafeEqual(createHash("sha256").update(given).digest(), createHash("sha256").update(expected).digest());
}

const slug = (v: unknown) => (typeof v === "string" && /^[a-z0-9-]{2,40}$/.test(v) ? v : null);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);

export async function POST(request: NextRequest) {
  if (!secretMatches(request.headers.get("x-fare-secret"))) return new Response("unauthorized", { status: 401 });
  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return new Response("bad body", { status: 400 }); }
  const host = typeof b.host === "string" ? b.host.trim().slice(0, 60) : "";
  if (!host) return new Response("missing host", { status: 400 });

  const doc = {
    state: b.state === "idle" ? "idle" : "running",
    cities: Array.isArray(b.cities) ? b.cities.map(slug).filter((x): x is string => !!x).slice(0, 12) : [],
    city: slug(b.city),
    destination: typeof b.destination === "string" ? b.destination.slice(0, 8) : null,
    done: int(b.done), total: int(b.total), requests: int(b.requests), failed: int(b.failed),
    passStartedAt: typeof b.passStartedAt === "string" ? b.passStartedAt.slice(0, 30) : null,
    lastStored: b.lastStored && typeof b.lastStored === "object" ? {
      city: slug((b.lastStored as Record<string, unknown>).city), fares: int((b.lastStored as Record<string, unknown>).fares),
      ok: !!(b.lastStored as Record<string, unknown>).ok, at: new Date().toISOString(),
    } : undefined,
    updatedAt: new Date().toISOString(),
  };
  try {
    const set = { ...doc } as Record<string, unknown>;
    if (!doc.lastStored) delete set.lastStored; // keep the previous "last stored" until a new city is stored
    await (await getFaresDb()).collection<{ _id: string }>("scraper_status").updateOne({ _id: host }, { $set: set }, { upsert: true });
    return new Response("ok");
  } catch { return new Response("unavailable", { status: 500 }); }
}
