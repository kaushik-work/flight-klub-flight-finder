import "server-only";
import { getCrmDb } from "@/lib/crm";
import { getFaresDb, FARES_COLLECTION } from "@/lib/flight-fares/store";

// Read-only queries for the CRM screens. Nothing here is cached: the admin always sees the current data.

const TZ = "Asia/Kolkata";
const monthOf = (field: string) => ({ $dateToString: { format: "%Y-%m", date: { $toDate: field }, timezone: TZ } });

export type MonthRow = { month: string; signups: number; purchases: number; amount: number };
export type Totals = { signups: number; purchases: number; amount: number; demoAmount: number };

export async function getReport(): Promise<{ months: MonthRow[]; all: Totals; thisMonth: Totals; currentMonth: string }> {
  const db = await getCrmDb();
  const [signups, pays] = await Promise.all([
    db.collection("members").aggregate([{ $group: { _id: monthOf("$createdAt"), n: { $sum: 1 } } }]).toArray(),
    db.collection("payments").aggregate([{ $group: { _id: { m: monthOf("$at"), mode: "$mode" }, n: { $sum: 1 }, amount: { $sum: "$amount" } } }]).toArray(),
  ]);

  const rows = new Map<string, MonthRow & { demo: number }>();
  const row = (m: string) => { let r = rows.get(m); if (!r) rows.set(m, (r = { month: m, signups: 0, purchases: 0, amount: 0, demo: 0 })); return r; };
  for (const s of signups) row(s._id as string).signups += s.n as number;
  for (const p of pays) {
    const r = row(p._id.m as string);
    r.purchases += p.n as number;
    r.amount += p.amount as number;
    if (p._id.mode !== "live") r.demo += p.amount as number;
  }

  const currentMonth = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
  const months = [...rows.values()].sort((a, b) => b.month.localeCompare(a.month));
  const sum = (list: (MonthRow & { demo: number })[]): Totals => list.reduce(
    (t, r) => ({ signups: t.signups + r.signups, purchases: t.purchases + r.purchases, amount: t.amount + r.amount, demoAmount: t.demoAmount + r.demo }),
    { signups: 0, purchases: 0, amount: 0, demoAmount: 0 });
  return {
    months: months.map(({ demo: _demo, ...r }) => r),
    all: sum(months),
    thisMonth: sum(months.filter((r) => r.month === currentMonth)),
    currentMonth,
  };
}

export type Member = { phone: string; name: string; email: string; city: string; plan: string; trial: boolean; createdAt: string };

export async function getSignups(): Promise<{ weeks: { start: string; n: number }[]; members: Member[]; total: number }> {
  const db = await getCrmDb();
  const [weeks, members, total] = await Promise.all([
    db.collection("members").aggregate([
      { $group: { _id: { $dateTrunc: { date: { $toDate: "$createdAt" }, unit: "week", startOfWeek: "monday", timezone: TZ } }, n: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]).toArray(),
    db.collection("members").find({}).sort({ createdAt: -1 }).limit(300).toArray(),
    db.collection("members").countDocuments({}),
  ]);
  return {
    weeks: weeks.map((w) => ({ start: new Date(w._id as Date).toISOString(), n: w.n as number })),
    members: members.map((m) => ({
      phone: String(m._id), name: String(m.name ?? ""), email: String(m.email ?? ""), city: String(m.city ?? ""),
      plan: String(m.plan ?? ""), trial: !!m.trial, createdAt: String(m.createdAt ?? ""),
    })),
    total,
  };
}

export type FareRow = { slug: string; city: string; country: string; intl: boolean; prices: Record<string, number> };

/** The cheapest stored fare for every destination from every city, optionally for one trip length. */
export async function getFareMatrix(nights: number | null): Promise<{ rows: FareRow[]; seen: string }> {
  const col = (await getFaresDb()).collection(FARES_COLLECTION);
  const out = await col.aggregate([
    { $match: { price: { $gt: 0 }, ...(nights ? { nights } : {}) } },
    { $group: { _id: { d: "$destinationSlug", o: "$originSlug" }, min: { $min: "$price" }, city: { $first: "$destination.city" }, country: { $first: "$destination.country" }, seen: { $max: "$retrievedAt" } } },
  ]).toArray();
  const map = new Map<string, FareRow>();
  let seen = "";
  for (const g of out) {
    const slug = g._id.d as string;
    let r = map.get(slug);
    if (!r) map.set(slug, (r = { slug, city: (g.city as string) || slug, country: (g.country as string) || "", intl: g.country !== "India", prices: {} }));
    r.prices[g._id.o as string] = g.min as number;
    if ((g.seen as string) > seen) seen = g.seen as string;
  }
  return { rows: [...map.values()], seen };
}

// ---- Fares screen: by month, by date, and scraper status ----

export type MonthCell = { city: string; country: string; intl: boolean; slug: string; byMonth: Record<string, number> };

/** Cheapest fare per destination and departure month, for one city (or the cheapest across all cities). */
export async function getMonthMatrix(origin: string | null, nights: number | null): Promise<{ rows: MonthCell[]; months: string[] }> {
  const col = (await getFaresDb()).collection(FARES_COLLECTION);
  const out = await col.aggregate([
    { $match: { price: { $gt: 0 }, ...(origin ? { originSlug: origin } : {}), ...(nights ? { nights } : {}) } },
    { $group: { _id: { d: "$destinationSlug", m: "$departureMonth" }, min: { $min: "$price" }, city: { $first: "$destination.city" }, country: { $first: "$destination.country" } } },
  ]).toArray();
  const rows = new Map<string, MonthCell>();
  const months = new Set<string>();
  for (const g of out) {
    const slug = g._id.d as string, month = g._id.m as string;
    months.add(month);
    let r = rows.get(slug);
    if (!r) rows.set(slug, (r = { slug, city: (g.city as string) || slug, country: (g.country as string) || "", intl: g.country !== "India", byMonth: {} }));
    r.byMonth[month] = g.min as number;
  }
  return { rows: [...rows.values()], months: [...months].sort() };
}

export type DateFare = { dep: string; ret: string; nights: number; price: number; airline: string; stops: number | null };

/** The cheapest stored fare for each departure date on one route (optionally one trip length). */
export async function getDateFares(origin: string, dest: string, nights: number | null): Promise<DateFare[]> {
  const col = (await getFaresDb()).collection(FARES_COLLECTION);
  const docs = await col.aggregate([
    { $match: { originSlug: origin, destinationSlug: dest, price: { $gt: 0 }, ...(nights ? { nights } : {}) } },
    { $sort: { price: 1 } },
    { $group: { _id: "$departureDate", d: { $first: "$$ROOT" } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  return docs.map((g) => ({
    dep: g._id as string, ret: String(g.d.returnDate ?? ""), nights: Number(g.d.nights ?? 0), price: Number(g.d.price),
    airline: String(g.d.outbound?.airlineName ?? ""), stops: typeof g.d.outbound?.stops === "number" ? g.d.outbound.stops : null,
  }));
}

export type CityStat = { slug: string; fares: number; destinations: number; lastStored: string; datesByMonth: Record<string, number> };

/** Per city: how many fares, how many destinations, when the data was last stored, and how many different departure dates each month has. */
export async function getCityStats(): Promise<CityStat[]> {
  const col = (await getFaresDb()).collection(FARES_COLLECTION);
  const [totals, dates] = await Promise.all([
    col.aggregate([{ $group: { _id: "$originSlug", fares: { $sum: 1 }, dests: { $addToSet: "$destinationSlug" }, last: { $max: "$retrievedAt" } } }]).toArray(),
    col.aggregate([{ $group: { _id: { o: "$originSlug", m: "$departureMonth", d: "$departureDate" } } }, { $group: { _id: { o: "$_id.o", m: "$_id.m" }, n: { $sum: 1 } } }]).toArray(),
  ]);
  const by = new Map<string, CityStat>();
  for (const t of totals) by.set(t._id as string, { slug: t._id as string, fares: t.fares as number, destinations: (t.dests as string[]).length, lastStored: String(t.last ?? ""), datesByMonth: {} });
  for (const d of dates) { const c = by.get(d._id.o as string); if (c) c.datesByMonth[d._id.m as string] = d.n as number; }
  return [...by.values()];
}

export type LiveStatus = {
  host: string; state: "running" | "idle"; cities: string[]; city: string | null; destination: string | null;
  done: number; total: number; requests: number; failed: number; passStartedAt: string | null; updatedAt: string;
  lastStored?: { city: string | null; fares: number; ok: boolean; at: string };
};

export async function getLiveStatus(): Promise<LiveStatus[]> {
  const docs = await (await getFaresDb()).collection("scraper_status").find({}).toArray();
  return docs.map((d) => ({
    host: String(d._id), state: d.state === "idle" ? "idle" : "running", cities: (d.cities as string[]) ?? [], city: (d.city as string | null) ?? null,
    destination: (d.destination as string | null) ?? null, done: Number(d.done ?? 0), total: Number(d.total ?? 0), requests: Number(d.requests ?? 0),
    failed: Number(d.failed ?? 0), passStartedAt: (d.passStartedAt as string | null) ?? null, updatedAt: String(d.updatedAt ?? ""), lastStored: d.lastStored,
  }));
}
