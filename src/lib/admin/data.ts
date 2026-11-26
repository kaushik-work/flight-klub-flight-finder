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
