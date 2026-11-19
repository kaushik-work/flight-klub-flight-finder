import { revalidateTag } from "next/cache";
import { type NextRequest } from "next/server";
import { FARES_COLLECTION, getFaresDb } from "@/lib/flight-fares/store";

// Ingest endpoint for the fare scraper (the fk-flight-finder repo).
//
//   POST /api/flight-fares    x-fare-secret: <FARE_INGEST_SECRET>
//     { originSlug, fares[] }  replaces every stored fare for that origin
//
// Only POST exists: the site reads the database directly, so there is no public read API.

// A pass returning under this share of what is stored is treated as a degraded scrape (blocked half way,
// a payload change), not as the truth, and is refused unless the caller sends allowShrink: true.
const MIN_KEEP_RATIO = 0.5;

type Fare = Record<string, unknown> & { destinationSlug?: unknown; departureDate?: unknown; price?: unknown };

const usable = (f: Fare) =>
  typeof f.destinationSlug === "string" &&
  typeof f.departureDate === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(f.departureDate) &&
  typeof f.price === "number" &&
  Number.isFinite(f.price) &&
  f.price > 0;

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-fare-secret");
  if (!process.env.FARE_INGEST_SECRET || secret !== process.env.FARE_INGEST_SECRET) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { originSlug?: unknown; fares?: unknown; allowShrink?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Body must be valid JSON" }, { status: 400 });
  }

  const originSlug = typeof body.originSlug === "string" ? body.originSlug : null;
  const submitted = Array.isArray(body.fares) ? (body.fares as Fare[]) : null;
  if (!originSlug || !submitted) {
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
    const rows = fares.map((f) => ({ ...f, originSlug, storedAt: batchId, batchId }));

    const existing = await col.countDocuments({ originSlug });
    if (existing > 0 && fares.length < existing * MIN_KEEP_RATIO && body.allowShrink !== true) {
      return Response.json(
        { success: false, error: `Refusing to replace ${existing} stored fares with ${fares.length}: looks like a degraded scrape. Send allowShrink: true if this is intended.` },
        { status: 409 },
      );
    }

    // Insert the new batch first, then remove the old one, so a failure leaves yesterday's prices in place.
    await col.insertMany(rows);
    await col.deleteMany({ originSlug, batchId: { $ne: batchId } });

    revalidateTag("flight-fares", { expire: 0 });
    return Response.json({ success: true, stored: rows.length, skipped: submitted.length - fares.length });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
