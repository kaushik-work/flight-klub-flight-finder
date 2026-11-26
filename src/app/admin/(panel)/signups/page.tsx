import { requireAdmin } from "@/lib/admin/auth";
import { getSignups } from "@/lib/admin/data";
import { formatDay } from "@/lib/fares";

const weekLabel = (iso: string) => formatDay(iso).replace(/ \d{4}$/, "");

export default async function AdminSignups() {
  await requireAdmin();
  let d;
  try { d = await getSignups(); } catch { d = null; }
  if (!d) return <p className="rounded-xl bg-white p-6 text-muted-foreground">The database could not be reached. Try again in a moment.</p>;
  const max = Math.max(1, ...d.weeks.map((w) => w.n));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="t-title text-3xl">Signups</h1>
        <p className="mt-1 text-sm text-muted-foreground">{d.total.toLocaleString("en-IN")} accounts in total. Weeks start on Monday.</p>
      </div>

      <section>
        <h2 className="t-title text-xl">Weekly signups</h2>
        <div className="mt-3 rounded-2xl border border-border bg-white p-5">
          {d.weeks.length === 0 ? <p className="text-sm text-muted-foreground">No signups recorded yet.</p> : (
            <ul className="space-y-2">
              {d.weeks.map((w) => (
                <li key={w.start} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-muted-foreground">Week of {weekLabel(w.start)}</span>
                  <span className="h-3 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${(w.n / max) * 100}%` }} /></span>
                  <span className="t-num w-8 text-right font-semibold">{w.n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="t-title text-xl">Everyone who signed up</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[44rem] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
              {["Name", "Mobile", "Email", "City", "Plan", "Joined"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {d.members.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nobody yet.</td></tr>}
              {d.members.map((m) => (
                <tr key={m.phone} className="border-b border-border/60">
                  <td className="px-4 py-3 font-semibold">{m.name}</td>
                  <td className="t-num px-4 py-3">{m.phone}</td>
                  <td className="px-4 py-3">{m.email || <span className="text-muted-foreground">-</span>}</td>
                  <td className="px-4 py-3">{m.city}</td>
                  <td className="px-4 py-3">{m.plan ? (m.plan === "12m" ? "12 months" : "3 months") : m.trial ? <span className="text-muted-foreground">Trial</span> : <span className="text-muted-foreground">-</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDay(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.total > d.members.length && <p className="mt-2 text-xs text-muted-foreground">Showing the latest {d.members.length} of {d.total}.</p>}
      </section>
    </div>
  );
}
