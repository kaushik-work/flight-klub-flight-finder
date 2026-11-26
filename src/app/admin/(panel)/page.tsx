import { ChangePasswordForm } from "@/components/admin/Forms";
import { requireAdmin } from "@/lib/admin/auth";
import { getReport, type Totals } from "@/lib/admin/data";
import { inr, monthLabel } from "@/lib/fares";

const n = (v: number) => v.toLocaleString("en-IN");

/** One period as one card: three figures side by side, split by thin lines. */
function Panel({ title, t }: { title: string; t: Totals }) {
  const items: [string, string][] = [["Signups", n(t.signups)], ["Purchases", n(t.purchases)], ["Collected", inr(t.amount)]];
  return (
    <section className="rounded-2xl border border-border bg-white">
      <h2 className="font-label border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <dl className="grid grid-cols-3 divide-x divide-border">
        {items.map(([k, v]) => (
          <div key={k} className="px-5 py-4">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="t-title t-num mt-1 text-2xl">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const th = "px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export default async function AdminHome() {
  await requireAdmin();
  let report;
  try { report = await getReport(); } catch { report = null; }
  if (!report) return <p className="rounded-2xl border border-border bg-white p-6 text-muted-foreground">The database could not be reached. Try again in a moment.</p>;
  const { months, all, thisMonth, currentMonth } = report;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="t-title text-3xl">Reports</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Signups, purchases and money collected. Amounts include GST.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`This month · ${monthLabel(currentMonth)}`} t={thisMonth} />
        <Panel title="All time" t={all} />
      </div>

      {all.demoAmount > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {inr(all.demoAmount)} of the collected amount comes from demo or Razorpay test payments, where no real money was taken. Only payments made with a live Razorpay key count as money collected for real.
        </p>
      )}

      <section>
        <h2 className="t-title text-xl">Month by month</h2>
        {months.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
            <p className="font-semibold">Nothing recorded yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Signups and payments appear here, month by month, as soon as people sign up and pay on the live site.</p>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[30rem] table-fixed text-sm">
              <colgroup><col className="w-[34%]" /><col className="w-[18%]" /><col className="w-[20%]" /><col className="w-[28%]" /></colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className={`${th} text-left`}>Month</th>
                  <th className={`${th} text-right`}>Signups</th>
                  <th className={`${th} text-right`}>Purchases</th>
                  <th className={`${th} text-right`}>Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {months.map((m) => (
                  <tr key={m.month}>
                    <td className="px-5 py-3 font-semibold">{monthLabel(m.month)}</td>
                    <td className="t-num px-5 py-3 text-right">{n(m.signups)}</td>
                    <td className="t-num px-5 py-3 text-right">{n(m.purchases)}</td>
                    <td className="t-num px-5 py-3 text-right font-semibold">{inr(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/50 font-semibold">
                  <td className="px-5 py-3">All time</td>
                  <td className="t-num px-5 py-3 text-right">{n(all.signups)}</td>
                  <td className="t-num px-5 py-3 text-right">{n(all.purchases)}</td>
                  <td className="t-num px-5 py-3 text-right">{inr(all.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <details className="rounded-2xl border border-border bg-white">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Change your password</summary>
        <div className="border-t border-border px-5 py-5"><ChangePasswordForm /></div>
      </details>
    </div>
  );
}
