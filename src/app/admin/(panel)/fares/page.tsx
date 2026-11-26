import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getFareMatrix } from "@/lib/admin/data";
import { formatDay, inr, ORIGINS } from "@/lib/fares";

const NIGHTS = [3, 4, 5, 6, 7];

export default async function AdminFares({ searchParams }: { searchParams: Promise<{ nights?: string; show?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const nights = NIGHTS.includes(Number(sp.nights)) ? Number(sp.nights) : null;
  const show = sp.show === "domestic" ? "domestic" : "international";
  let m;
  try { m = await getFareMatrix(nights); } catch { m = null; }
  if (!m) return <p className="rounded-xl bg-white p-6 text-muted-foreground">The database could not be reached. Try again in a moment.</p>;

  const rows = m.rows.filter((r) => (show === "international" ? r.intl : !r.intl))
    .sort((a, b) => Math.min(...Object.values(a.prices)) - Math.min(...Object.values(b.prices)));
  const q = (n: number | null, s: string) => `/admin/fares?${[n ? `nights=${n}` : "", `show=${s}`].filter(Boolean).join("&")}`;
  const chip = (on: boolean) => `font-label rounded-lg px-3 py-1.5 text-sm font-semibold transition ${on ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="t-title text-3xl">All fares</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cheapest stored round-trip fare for each destination from each city{nights ? `, ${nights}-night trips` : ", any trip length"}. Rupees.{m.seen ? ` Last checked ${formatDay(m.seen)}.` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
          <Link href={q(nights, "international")} className={chip(show === "international")}>International</Link>
          <Link href={q(nights, "domestic")} className={chip(show === "domestic")}>Domestic</Link>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
          <Link href={q(null, show)} className={chip(!nights)}>Any</Link>
          {NIGHTS.map((n) => <Link key={n} href={q(n, show)} className={chip(nights === n)}>{n}N</Link>)}
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-border bg-white" style={{ maxHeight: "75vh" }}>
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_var(--border)]">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="sticky left-0 bg-white px-4 py-3 font-semibold">Destination</th>
              {ORIGINS.map((o) => <th key={o.slug} className="px-3 py-3 text-right font-semibold">{o.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={ORIGINS.length + 1} className="px-4 py-8 text-center text-muted-foreground">No fares stored for this choice.</td></tr>}
            {rows.map((r) => {
              const lowest = Math.min(...Object.values(r.prices));
              return (
                <tr key={r.slug} className="border-b border-border/60">
                  <td className="sticky left-0 bg-white px-4 py-2.5"><span className="font-semibold">{r.city}</span><span className="ml-2 text-xs text-muted-foreground">{r.country}</span></td>
                  {ORIGINS.map((o) => {
                    const p = r.prices[o.slug];
                    return (
                      <td key={o.slug} className={`t-num px-3 py-2.5 text-right ${p === undefined ? "text-muted-foreground/50" : p === lowest ? "font-semibold text-price" : ""}`}>
                        {p === undefined ? "-" : inr(p)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Green is the cheapest city for that destination. A dash means no fare stored yet.</p>
    </div>
  );
}
