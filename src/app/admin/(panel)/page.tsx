import { ChangePasswordForm } from "@/components/admin/Forms";
import { requireAdmin } from "@/lib/admin/auth";
import { getReport, type Totals } from "@/lib/admin/data";
import { inr, monthLabel } from "@/lib/fares";

function Kpis({ title, t }: { title: string; t: Totals }) {
  const items = [["Signups", t.signups.toLocaleString("en-IN")], ["Purchases", t.purchases.toLocaleString("en-IN")], ["Collected", inr(t.amount)]];
  return (
    <section>
      <h2 className="font-label mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-white px-4 py-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="t-title t-num mt-1 text-2xl">{v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AdminHome() {
  await requireAdmin();
  let report;
  try { report = await getReport(); } catch { report = null; }
  if (!report) return <p className="rounded-xl bg-white p-6 text-muted-foreground">The database could not be reached. Try again in a moment.</p>;
  const { months, all, thisMonth, currentMonth } = report;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="t-title text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Signups, purchases and money collected. Amounts include GST.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Kpis title={`This month · ${monthLabel(currentMonth)}`} t={thisMonth} />
        <Kpis title="All time" t={all} />
      </div>
      {all.demoAmount > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {inr(all.demoAmount)} of the collected amount comes from the demo checkout, where no real money was taken. It will read as live once real payments are switched on.
        </p>
      )}

      <section>
        <h2 className="t-title text-xl">Month by month</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[28rem] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Month</th><th className="px-4 py-3 text-right font-semibold">Signups</th>
              <th className="px-4 py-3 text-right font-semibold">Purchases</th><th className="px-4 py-3 text-right font-semibold">Collected</th>
            </tr></thead>
            <tbody>
              {months.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No signups or purchases recorded yet.</td></tr>}
              {months.map((m) => (
                <tr key={m.month} className="border-b border-border/60">
                  <td className="px-4 py-3 font-semibold">{monthLabel(m.month)}</td>
                  <td className="t-num px-4 py-3 text-right">{m.signups}</td>
                  <td className="t-num px-4 py-3 text-right">{m.purchases}</td>
                  <td className="t-num px-4 py-3 text-right font-semibold">{inr(m.amount)}</td>
                </tr>
              ))}
              {months.length > 0 && (
                <tr className="bg-muted/60 font-semibold">
                  <td className="px-4 py-3">All time</td>
                  <td className="t-num px-4 py-3 text-right">{all.signups}</td>
                  <td className="t-num px-4 py-3 text-right">{all.purchases}</td>
                  <td className="t-num px-4 py-3 text-right">{inr(all.amount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-2xl border border-border bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold">Change your password</summary>
        <div className="mt-4"><ChangePasswordForm /></div>
      </details>
    </div>
  );
}
