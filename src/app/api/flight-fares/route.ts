import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { type NextRequest } from "next/server";
import { FARES_COLLECTION, getFaresDb } from "@/lib/flight-fares/store";

// Ingest endpoint for the fare scraper (the fk-flight-finder repo).
//
//   POST /api/flight-fares    x-fare-secret: <FARE_INGEST_SECRET>
//     { originSlug, fares[] }  updates those fares in place and keeps the origin's other fares for KEEP_DAYS
//
// Only POST exists: the site reads the database directly, so there is no public read API.

// A pass returning under this share of what is stored is treated as a degraded scrape (blocked half way,
// a payload change), not as the truth, and is refused unless the caller sends allowShrink: true.
const MIN_KEEP_RATIO = 0.5;

// How long a fare that has not been priced again is kept. 8 days so that every weekday the scraper rotates through is in the store.
const KEEP_DAYS = 8;

type Fare = Record<string, unknown> & { destinationSlug?: unknown; departureDate?: unknown; price?: unknown };

const usable = (f: Fare) =>
  typeof f.destinationSlug === "string" &&
  typeof f.departureDate === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(f.departureDate) &&
  typeof f.price === "number" &&
  Number.isFinite(f.price) &&
  f.price > 0;

const MAX_BODY_BYTES = 25 * 1024 * 1024;
const MAX_FARES = 20000;

// Constant-time comparison (hashing first makes the lengths equal), so response timing never leaks the secret.
function secretMatches(given: string | null): boolean {
  const expected = process.env.FARE_INGEST_SECRET;
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// Slows password guessing: 10 bad secrets per IP per 15 minutes. In memory, so it is per server instance.
const strikes = new Map<string, { n: number; reset: number }>();
function blocked(ip: string): boolean {
  const s = strikes.get(ip);
  return !!s && s.reset > Date.now() && s.n >= 10;
}
function strike(ip: string) {
  const now = Date.now();
  const s = strikes.get(ip);
  if (!s || s.reset <= now) strikes.set(ip, { n: 1, reset: now + 15 * 60 * 1000 });
  else s.n += 1;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (blocked(ip)) return Response.json({ success: false, error: "Too many attempts" }, { status: 429 });
  if (!secretMatches(request.headers.get("x-fare-secret"))) {
    strike(ip);
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return Response.json({ success: false, error: "Payload too large" }, { status: 413 });
  }

  let body: { originSlug?: unknown; fares?: unknown; allowShrink?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Body must be valid JSON" }, { status: 400 });
  }

  const originSlug = typeof body.originSlug === "string" ? body.originSlug : null;
  const submitted = Array.isArray(body.fares) ? (body.fares as Fare[]) : null;
  if (!originSlug || !/^[a-z0-9-]{1,40}$/.test(originSlug) || !submitted || submitted.length > MAX_FARES) {
    return Response.json({ success: false, error: "originSlug and fares[] are required" }, { status: 400 });
  }

  // Drop rows that would render as a blank or nonsensical price rather than store them.
  const fares = submitted.filter(usable);

  // An empty set is never written: a failed scrape must look like stale prices, not like there are no flights.
  if (fares.length === 0) {
    return Response.json({ success: false, error: "Refusing to replace stored fares with an empty set" }, { status: 400 });
  }

  try {
    const col = (await getFaresDb()).collection(FARES_COLLECTION);
    const batchId = new Date().toISOString();

    // The degraded-scrape guard compares with the size of the previous pass (its batch), not with everything stored,
    // because fares are now kept for several days and the store holds more than one pass.
    const last = await col.find({ originSlug }, { projection: { batchId: 1 } }).sort({ storedAt: -1 }).limit(1).next();
    const previous = last?.batchId ? await col.countDocuments({ originSlug, batchId: last.batchId }) : 0;
    if (previous > 0 && fares.length < previous * MIN_KEEP_RATIO && body.allowShrink !== true) {
      return Response.json(
        { success: false, error: `Refusing to store ${fares.length} fares after a pass of ${previous}: looks like a degraded scrape. Send allowShrink: true if this is intended.` },
        { status: 409 },
      );
    }

    // Upsert on the trip itself (origin, destination, both dates), so a fare that is priced again is updated in place and
    // one that is not priced this pass is kept until it is KEEP_DAYS old. The scraper rotates the weekdays it samples, so
    // the days together give every weekday, and a date someone looked at yesterday is still there today.
    await col.createIndex({ originSlug: 1, destinationSlug: 1, departureDate: 1, returnDate: 1 }).catch(() => {});
    for (let i = 0; i < fares.length; i += 1000) {
      await col.bulkWrite(
        fares.slice(i, i + 1000).map((f) => ({
          updateOne: {
            filter: { originSlug, destinationSlug: f.destinationSlug, departureDate: f.departureDate, returnDate: f.returnDate },
            update: { $set: { ...f, originSlug, storedAt: batchId, batchId } },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    // Price history: one small row per origin, destination, trip length, departure month and day, holding that day's lowest
    // and highest stored fare. It is what a "usual price" and a price trend are made of, and it survives the 8-day clean-up
    // below. About a thousand rows per origin per day, kept for 400 days.
    try {
      const hist = (await getFaresDb()).collection("fare_history");
      await hist.createIndex({ at: 1 }, { expireAfterSeconds: 400 * 86_400 }).catch(() => {});
      await hist.createIndex({ originSlug: 1, destinationSlug: 1, nights: 1 }).catch(() => {});
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      const groups = new Map<string, { dest: string; nights: number; month: string; min: number; max: number; sum: number; n: number }>();
      for (const f of fares) {
        const dest = String(f.destinationSlug), nights = Number(f.nights) || 0, month = String(f.departureMonth ?? String(f.departureDate).slice(0, 7));
        const price = Number(f.price), k = `${dest}:${nights}:${month}`;
        const g = groups.get(k);
        if (!g) groups.set(k, { dest, nights, month, min: price, max: price, sum: price, n: 1 });
        else { g.min = Math.min(g.min, price); g.max = Math.max(g.max, price); g.sum += price; g.n += 1; }
      }
      if (groups.size) {
        await hist.bulkWrite(
          [...groups.values()].map((g) => ({
            updateOne: {
              filter: { _id: `${originSlug}:${g.dest}:${g.nights}:${g.month}:${day}` as never },
              update: {
                $min: { min: g.min }, $max: { max: g.max }, $inc: { sum: g.sum, n: g.n },
                $set: { originSlug, destinationSlug: g.dest, nights: g.nights, month: g.month, day, at: new Date() },
              },
              upsert: true,
            },
          })),
          { ordered: false },
        );
      }
    } catch (error) {
      console.error("fare history write failed", error); // history is a bonus: never fail the fare store because of it
    }

    // Remove what has aged out, and trips that have already left. A failure above leaves everything as it was.
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const removed = await col.deleteMany({ originSlug, $or: [{ retrievedAt: { $lt: cutoff } }, { departureDate: { $lt: today } }] });

    revalidateTag("flight-fares", { expire: 0 });
    return Response.json({ success: true, stored: fares.length, skipped: submitted.length - fares.length, removed: removed.deletedCount });
  } catch (error) {
    console.error("flight-fares ingest failed", error);
    return Response.json({ success: false, error: "Could not store fares" }, { status: 500 });
  }
}
