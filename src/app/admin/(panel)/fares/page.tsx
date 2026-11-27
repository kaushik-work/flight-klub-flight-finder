import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { type CityStat, type DateFare, type LiveStatus, getCityStats, getDateFares, getFareMatrix, getHistory, getLiveStatus, getMonthMatrix } from "@/lib/admin/data";
import { DROPLETS, TOTAL_DESTINATIONS } from "@/lib/admin/droplets";
import { formatDay, inr, monthLabel, ORIGINS } from "@/lib/fares";

type SP = { view?: string; from?: string; to?: string; nights?: string; show?: string };
const VIEWS = [["month", "Month wise"], ["date", "Date wise"], ["cities", "All cities"], ["history", "Price history"], ["scraper", "Scraper status"]] as const;
const NIGHTS = [3, 4, 5, 6, 7];
const cityName = (slug: string) => ORIGINS.find((o) => o.slug === slug)?.name ?? slug;

const select = "h-10 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary";
const card = "rounded-2xl border border-border bg-white";
const th = "px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function ago(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "never";
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
}
const ageHours = (iso: string) => (Date.now() - Date.parse(iso)) / 3_600_000;

export default async function AdminFares({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const view = VIEWS.some(([v]) => v === sp.view) ? sp.view! : "month";
  const nights = NIGHTS.includes(Number(sp.nights)) ? Number(sp.nights) : null;
  const show = sp.show === "domestic" ? "domestic" : "international";
  const from = ORIGINS.some((o) => o.slug === sp.from) ? sp.from! : view === "month" ? "" : ORIGINS[0].slug;

  let body: React.ReactNode;
  try {
    if (view === "month") body = await MonthView({ from, nights, show });
    else if (view === "date") body = await DateView({ from: from || ORIGINS[0].slug, to: sp.to ?? "", nights });
    else if (view === "history") body = await HistoryView({ from: from || ORIGINS[0].slug, to: sp.to ?? "", nights: nights ?? 5 });
    else if (view === "cities") body = await CitiesView({ nights, show });
    else body = await ScraperView();
  } catch {
    body = <p className={`${card} p-6 text-muted-foreground`}>The database could not be reached. Try again in a moment.</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="t-title text-3xl">Fares</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Every stored fare, by month, by date and by city, and how the scraper is doing. Rupees, round trip.</p>
      </header>

      <nav aria-label="Fares views" className="font-label inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1 text-sm font-semibold">
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={`/admin/fares?view=${v}`} aria-current={view === v ? "page" : undefined}
            className={`rounded-lg px-4 py-1.5 transition ${view === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</Link>
        ))}
      </nav>

      {body}
    </div>
  );
}

/** Filters as a plain GET form: no client code, and the URL can be shared or bookmarked. */
function Filters({ view, children }: { view: string; children: React.ReactNode }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="view" value={view} />
      {children}
      <button className="font-label h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Show</button>
    </form>
  );
}
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="text-xs font-semibold text-muted-foreground">{label}<span className="mt-1 block">{children}</span></label>
);
const NightsSelect = ({ nights }: { nights: number | null }) => (
  <Field label="Trip length">
    <select name="nights" defaultValue={nights ?? ""} className={select}>
      <option value="">Any length</option>
      {NIGHTS.map((n) => <option key={n} value={n}>{n} nights</option>)}
    </select>
  </Field>
);
const ShowSelect = ({ show }: { show: string }) => (
  <Field label="Show">
    <select name="show" defaultValue={show} className={select}><option value="international">International</option><option value="domestic">Domestic</option></select>
  </Field>
);

/* ---------- Month wise: destination x month, for one city ---------- */
async function MonthView({ from, nights, show }: { from: string; nights: number | null; show: string }) {
  const m = await getMonthMatrix(from || null, nights);
  const rows = m.rows.filter((r) => (show === "international" ? r.intl : !r.intl))
    .sort((a, b) => Math.min(...Object.values(a.byMonth)) - Math.min(...Object.values(b.byMonth)));
  const cheapestByMonth = Object.fromEntries(m.months.map((mo) => [mo, Math.min(...rows.map((r) => r.byMonth[mo] ?? Infinity))]));
  return (
    <>
      <Filters view="month">
        <Field label="Flying from">
          <select name="from" defaultValue={from} className={select}><option value="">All cities (cheapest)</option>{ORIGINS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select>
        </Field>
        <ShowSelect show={show} />
        <NightsSelect nights={nights} />
      </Filters>
      <div className={`${card} overflow-auto`} style={{ maxHeight: "70vh" }}>
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_var(--border)]">
            <tr><th className={`${th} sticky left-0 bg-white text-left`}>Destination</th>{m.months.map((mo) => <th key={mo} className={`${th} text-right`}>{monthLabel(mo)}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {rows.length === 0 && <tr><td colSpan={m.months.length + 1} className="px-4 py-10 text-center text-muted-foreground">No fares stored for this choice.</td></tr>}
            {rows.map((r) => {
              const low = Math.min(...Object.values(r.byMonth));
              return (
                <tr key={r.slug}>
                  <td className="sticky left-0 bg-white px-3 py-2.5"><span className="font-semibold">{r.city}</span><span className="ml-2 text-xs text-muted-foreground">{r.country}</span></td>
                  {m.months.map((mo) => {
                    const p = r.byMonth[mo];
                    return (
                      <td key={mo} className={`t-num px-3 py-2.5 text-right ${p === undefined ? "text-muted-foreground/40" : p === low ? "font-semibold text-price" : ""} ${p !== undefined && p === cheapestByMonth[mo] ? "bg-green-50" : ""}`}>
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
      <p className="text-xs text-muted-foreground">Cheapest fare leaving in each month{from ? ` from ${cityName(from)}` : " from any city"}{nights ? `, ${nights}-night trips` : ""}. Green text is that destination&apos;s cheapest month; a green cell is the cheapest destination that month. A dash means no fare stored.</p>
    </>
  );
}

/* ---------- Date wise: a calendar for one route ---------- */
const fmtK = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`);

async function DateView({ from, to, nights }: { from: string; to: string; nights: number | null }) {
  const stats = await getCityStats();
  const dests = (await getMonthMatrix(from, null)).rows.sort((a, b) => a.city.localeCompare(b.city));
  const dest = dests.some((d) => d.slug === to) ? to : dests[0]?.slug ?? "";
  const fares = dest ? await getDateFares(from, dest, nights) : [];
  const byDate = new Map(fares.map((f) => [f.dep, f]));
  const prices = fares.map((f) => f.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const top3 = new Set([...fares].sort((a, b) => a.price - b.price).slice(0, 3).map((f) => f.dep));
  const months = [...new Set(fares.map((f) => f.dep.slice(0, 7)))].sort();
  void stats;

  const tint = (p: number) => {
    const t = hi === lo ? 0 : (p - lo) / (hi - lo); // 0 cheapest .. 1 dearest
    return `hsl(${Math.round(135 - t * 105)} 70% ${Math.round(90 - (1 - t) * 8)}%)`;
  };

  return (
    <>
      <Filters view="date">
        <Field label="Flying from">
          <select name="from" defaultValue={from} className={select}>{ORIGINS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select>
        </Field>
        <Field label="Going to">
          <select name="to" defaultValue={dest} className={select}>{dests.map((d) => <option key={d.slug} value={d.slug}>{d.city}</option>)}</select>
        </Field>
        <NightsSelect nights={nights} />
      </Filters>

      {fares.length === 0 ? (
        <p className={`${card} p-6 text-muted-foreground`}>No fares stored for this route{nights ? ` at ${nights} nights` : ""}.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {cityName(from)} to {dests.find((d) => d.slug === dest)?.city}: {fares.length} departure dates priced, from <span className="font-semibold text-price">{inr(lo)}</span> to <span className="font-semibold">{inr(hi)}</span>. The three cheapest are outlined.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {months.map((mo) => <Calendar key={mo} month={mo} byDate={byDate} top3={top3} tint={tint} />)}
          </div>
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[34rem] text-sm">
              <thead><tr className="border-b border-border bg-muted/50 text-left">
                {["Departs", "Returns", "Nights", "Airline", "Stops", "Fare"].map((h, i) => <th key={h} className={`${th} px-4 ${i === 5 ? "text-right" : ""}`}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border/70">
                {[...fares].sort((a, b) => a.price - b.price).slice(0, 15).map((f) => (
                  <tr key={f.dep}>
                    <td className="px-4 py-2.5 font-semibold">{formatDay(f.dep)}</td><td className="px-4 py-2.5">{formatDay(f.ret)}</td>
                    <td className="px-4 py-2.5">{f.nights}</td><td className="px-4 py-2.5">{f.airline || "-"}</td>
                    <td className="px-4 py-2.5">{f.stops === null ? "-" : f.stops === 0 ? "Non-stop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}</td>
                    <td className="t-num px-4 py-2.5 text-right font-semibold">{inr(f.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">The table lists the 15 cheapest dates. Only some dates in each month are priced: the scraper checks a spread of weekdays, not every day.</p>
        </>
      )}
    </>
  );
}

function Calendar({ month, byDate, top3, tint }: { month: string; byDate: Map<string, DateFare>; top3: Set<string>; tint: (p: number) => string }) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <section className={`${card} p-4`}>
      <h3 className="t-title text-lg">{monthLabel(month)}</h3>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const key = `${month}-${String(d).padStart(2, "0")}`;
          const f = byDate.get(key);
          return (
            <div key={key} title={f ? `${formatDay(f.dep)} to ${formatDay(f.ret)} · ${f.nights} nights · ${f.airline || "airline unknown"} · ${inr(f.price)}` : "No fare stored"}
              className={`flex h-14 flex-col items-center justify-center rounded-lg text-xs ${f ? "text-foreground" : "text-muted-foreground/40"} ${top3.has(key) ? "ring-2 ring-primary" : ""}`}
              style={f ? { background: tint(f.price) } : { background: "var(--muted)" }}>
              <span className="text-[10px] opacity-70">{d}</span>
              {f && <span className="t-num font-semibold">{fmtK(f.price)}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Price history: the lowest fare on each day we have stored ---------- */
async function HistoryView({ from, to, nights }: { from: string; to: string; nights: number }) {
  const dests = (await getMonthMatrix(from, null)).rows.sort((a, b) => a.city.localeCompare(b.city));
  const dest = dests.some((d) => d.slug === to) ? to : dests[0]?.slug ?? "";
  const days = dest ? await getHistory(from, dest, nights) : [];
  const months = [...new Set(days.flatMap((d) => Object.keys(d.byMonth)))].sort();
  const max = Math.max(1, ...days.map((d) => d.lowest));
  return (
    <>
      <Filters view="history">
        <Field label="Flying from"><select name="from" defaultValue={from} className={select}>{ORIGINS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></Field>
        <Field label="Going to"><select name="to" defaultValue={dest} className={select}>{dests.map((d) => <option key={d.slug} value={d.slug}>{d.city}</option>)}</select></Field>
        <Field label="Trip length"><select name="nights" defaultValue={nights} className={select}>{NIGHTS.map((n) => <option key={n} value={n}>{n} nights</option>)}</select></Field>
      </Filters>
      {days.length === 0 ? (
        <p className={`${card} p-6 text-muted-foreground`}>No history yet for this route. A row is added each day the scraper stores fares for it, so a trend appears after a few days.</p>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[34rem] text-sm">
            <thead><tr className="border-b border-border bg-muted/50 text-left">
              <th className={`${th} px-4`}>Day</th><th className={`${th} text-right`}>Lowest</th><th className={`${th} w-1/3`}> </th>
              {months.map((m) => <th key={m} className={`${th} text-right`}>{monthLabel(m).split(" ")[0]}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border/70">
              {days.map((d) => (
                <tr key={d.day}>
                  <td className="px-4 py-2.5 font-semibold">{formatDay(d.day)}</td>
                  <td className="t-num px-3 py-2.5 text-right font-semibold text-price">{inr(d.lowest)}</td>
                  <td className="px-3 py-2.5"><span className="block h-2 rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${(d.lowest / max) * 100}%` }} /></span></td>
                  {months.map((m) => <td key={m} className="t-num px-3 py-2.5 text-right">{d.byMonth[m] !== undefined ? inr(d.byMonth[m]) : "-"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">The lowest stored fare for this route and trip length on each day, and the lowest for each departure month. Kept for 400 days. A day only appears once the scraper has stored fares that day.</p>
    </>
  );
}

/* ---------- All cities: destination x city ---------- */
async function CitiesView({ nights, show }: { nights: number | null; show: string }) {
  const m = await getFareMatrix(nights);
  const rows = m.rows.filter((r) => (show === "international" ? r.intl : !r.intl)).sort((a, b) => Math.min(...Object.values(a.prices)) - Math.min(...Object.values(b.prices)));
  return (
    <>
      <Filters view="cities"><ShowSelect show={show} /><NightsSelect nights={nights} /></Filters>
      <div className={`${card} overflow-auto`} style={{ maxHeight: "70vh" }}>
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_var(--border)]">
            <tr><th className={`${th} sticky left-0 bg-white text-left`}>Destination</th>{ORIGINS.map((o) => <th key={o.slug} className={`${th} text-right`}>{o.name}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {rows.length === 0 && <tr><td colSpan={ORIGINS.length + 1} className="px-4 py-10 text-center text-muted-foreground">No fares stored for this choice.</td></tr>}
            {rows.map((r) => {
              const low = Math.min(...Object.values(r.prices));
              return (
                <tr key={r.slug}>
                  <td className="sticky left-0 bg-white px-3 py-2.5"><span className="font-semibold">{r.city}</span><span className="ml-2 text-xs text-muted-foreground">{r.country}</span></td>
                  {ORIGINS.map((o) => {
                    const p = r.prices[o.slug];
                    return <td key={o.slug} className={`t-num px-3 py-2.5 text-right ${p === undefined ? "text-muted-foreground/40" : p === low ? "font-semibold text-price" : ""}`}>{p === undefined ? "-" : inr(p)}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Cheapest stored fare for each destination from each city{nights ? `, ${nights}-night trips` : ""}. Green is the cheapest city for that destination.</p>
    </>
  );
}

/* ---------- Scraper status ---------- */
function liveFor(live: LiveStatus[], cities: readonly string[]) {
  return live.filter((l) => l.cities.some((c) => cities.includes(c))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

async function ScraperView() {
  const [stats, live] = await Promise.all([getCityStats(), getLiveStatus()]);
  const stat = new Map<string, CityStat>(stats.map((s) => [s.slug, s]));
  const allMonths = [...new Set(stats.flatMap((s) => Object.keys(s.datesByMonth)))].sort();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        {DROPLETS.map((d) => {
          const l = liveFor(live, d.cities);
          const minutes = l ? (Date.now() - Date.parse(l.updatedAt)) / 60000 : null;
          const silent = l?.state === "running" && minutes !== null && minutes > 20;
          const pct = l && l.total ? Math.round((l.done / l.total) * 100) : 0;
          return (
            <div key={d.name} className={`${card} p-5`}>
              <div className="flex items-baseline justify-between"><h3 className="t-title text-lg">{d.name}</h3><span className="text-xs text-muted-foreground">{d.ip}</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{d.cities.map(cityName).join(" → ")}</p>
              <div className="mt-4 text-sm">
                {!l ? (
                  <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">No live report yet. Reports start once the droplet is running the latest scraper version.</p>
                ) : l.state === "idle" ? (
                  <p className="rounded-lg bg-muted px-3 py-2">Idle · pass finished {ago(l.updatedAt)}</p>
                ) : (
                  <>
                    <p className={`rounded-lg px-3 py-2 ${silent ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-900"}`}>
                      {silent ? `No report for ${Math.round(minutes!)} min. It may be waiting on Google.` : "Running"} · {l.city ? cityName(l.city) : "starting"}{l.destination ? ` · ${l.destination}` : ""}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="City progress">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{l.done} of {l.total} destinations · {l.requests.toLocaleString("en-IN")} requests, {l.failed} failed · updated {ago(l.updatedAt)}</p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="t-title text-xl">Each city</h2>
        <div className={`${card} mt-3 overflow-x-auto`}>
          <table className="w-full min-w-[46rem] text-sm">
            <thead><tr className="border-b border-border bg-muted/50 text-left">
              <th className={`${th} px-4`}>City</th><th className={th}>Droplet</th><th className={th}>Last stored</th><th className={th}>Status</th>
              <th className={`${th} text-right`}>Fares</th><th className={`${th} text-right`}>Destinations</th>
              {allMonths.map((mo) => <th key={mo} className={`${th} text-right`} title="Different departure dates priced">{monthLabel(mo).split(" ")[0]}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border/70">
              {ORIGINS.map((o) => {
                const s = stat.get(o.slug);
                const dr = DROPLETS.find((d) => (d.cities as readonly string[]).includes(o.slug));
                const h = s ? ageHours(s.lastStored) : Infinity;
                const chip = !s ? ["No data", "bg-muted text-muted-foreground"] : h < 24 ? ["Fresh", "bg-green-100 text-green-800"] : h < 48 ? ["Aging", "bg-amber-100 text-amber-800"] : ["Stale", "bg-red-100 text-red-800"];
                return (
                  <tr key={o.slug}>
                    <td className="px-4 py-2.5 font-semibold">{o.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{dr?.name ?? "-"}</td>
                    <td className="px-3 py-2.5">{s ? ago(s.lastStored) : "-"}</td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip[1]}`}>{chip[0]}</span></td>
                    <td className="t-num px-3 py-2.5 text-right">{s ? s.fares.toLocaleString("en-IN") : "-"}</td>
                    <td className={`t-num px-3 py-2.5 text-right ${s && s.destinations < TOTAL_DESTINATIONS - 3 ? "text-amber-700" : ""}`}>{s ? `${s.destinations} / ${TOTAL_DESTINATIONS}` : "-"}</td>
                    {allMonths.map((mo) => <td key={mo} className="t-num px-3 py-2.5 text-right">{s?.datesByMonth[mo] ?? "-"}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Fresh is stored in the last 24 hours, aging 24 to 48 hours, stale longer. The month columns count how many different departure dates are priced; a low count means a thin month. A city is only written to the database when its whole run finishes, so &quot;last stored&quot; moves in jumps.</p>
      </section>
    </div>
  );
}
