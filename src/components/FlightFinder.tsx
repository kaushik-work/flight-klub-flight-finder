"use client";

import Link from "next/link";
import PriceTag from "@/components/PriceTag";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useMemo, useState, useTransition } from "react";
import { useHomeOrigin } from "@/components/location/LocationProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ORIGINS, type Origin, type Row, formatDay, formatDuration, formatRange, formatStops, gradientFor, inr, monthLabel,
} from "@/lib/fares";

const seg = (on: boolean) =>
  `font-label h-9 rounded-lg px-4 text-sm font-semibold transition ${
    on ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
  }`;

const field =
  "font-label h-12 w-full appearance-none rounded-xl border border-border bg-white pl-4 pr-10 text-sm font-semibold text-foreground outline-none transition hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10";

function Chevron() {
  return (
    <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="relative block">{children}<Chevron /></span>
    </label>
  );
}

/** One row per destination: the cheapest that matches. */
function cheapest(rows: Row[]) {
  const best = new Map<string, Row>();
  for (const r of rows) {
    const c = best.get(r.d);
    if (!c || r.price < c.price) best.set(r.d, r);
  }
  return [...best.values()];
}

export default function FlightFinder({
  origin,
  rows,
  initialDest = "",
  initialNights = null,
  initialMonth = null,
  fromExplicit = true,
}: {
  origin: Origin;
  rows: Row[];
  initialDest?: string;
  initialNights?: number | null;
  initialMonth?: string | null;
  fromExplicit?: boolean;
}) {
  const router = useRouter();
  const [moving, startMove] = useTransition();
  const { ready, user, alerts, toggleAlert } = useAuth();
  const { origin: near, setUserOrigin } = useHomeOrigin();

  // No city in the URL: use the nearest airport once it is known.
  useEffect(() => {
    if (fromExplicit || !near || near === origin.slug) return;
    const q = new URLSearchParams(window.location.search);
    q.set("from", near);
    router.replace(`/flight-finder?${q}`);
  }, [fromExplicit, near, origin.slug, router]);
  const [intl, setIntl] = useState(rows.find((r) => r.d === initialDest)?.intl ?? true);
  const [dest, setDest] = useState(initialDest);
  const [nights, setNights] = useState<number | null>(initialNights);
  const [month, setMonth] = useState<string | null>(initialMonth);
  const [sort, setSort] = useState<"cheapest" | "shortest">("cheapest");
  const [direct, setDirect] = useState(false);

  const pool = useMemo(() => rows.filter((r) => r.intl === intl), [rows, intl]);
  const months = useMemo(() => [...new Set(rows.map((r) => r.month))].sort(), [rows]);
  const nightOpts = useMemo(() => [...new Set(rows.map((r) => r.nights))].sort((a, b) => a - b), [rows]);
  const dests = useMemo(() => [...new Map(pool.map((r) => [r.d, r.city])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [pool]);
  const counts = useMemo(() => ({
    intl: new Set(rows.filter((r) => r.intl).map((r) => r.d)).size,
    dom: new Set(rows.filter((r) => !r.intl).map((r) => r.d)).size,
  }), [rows]);

  const monthMin = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of pool) if ((!nights || r.nights === nights) && (m[r.month] === undefined || r.price < m[r.month])) m[r.month] = r.price;
    return m;
  }, [pool, nights]);

  const results = useMemo(() => {
    let r = pool;
    if (month) r = r.filter((x) => x.month === month);
    if (nights) r = r.filter((x) => x.nights === nights);
    if (dest) r = r.filter((x) => x.d === dest);
    if (direct) r = r.filter((x) => x.stops === 0);
    const out = cheapest(r);
    return out.sort((a, b) =>
      sort === "cheapest" ? a.price - b.price : (a.mins ?? Infinity) - (b.mins ?? Infinity) || a.price - b.price,
    );
  }, [pool, month, nights, dest, direct, sort]);

  // Average fare per destination over every priced date, so a result can show how far below average it is.
  const avgByDest = useMemo(() => {
    const t: Record<string, { sum: number; n: number }> = {};
    for (const r of pool) { const x = (t[r.d] ??= { sum: 0, n: 0 }); x.sum += r.price; x.n += 1; }
    return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.sum / v.n]));
  }, [pool]);

  const lastSeen = useMemo(() => rows.reduce((m, r) => (r.seen > m ? r.seen : m), ""), [rows]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10">
      <section className="pb-6 pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {intl ? "International" : "Domestic"} flights from {origin.name}
        </h1>
        <p className="mt-2 text-muted-foreground">Cheapest destinations and months, ranked by recent round-trip fares.</p>
      </section>

      <form onSubmit={(e) => e.preventDefault()} className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <Field label="Flying from">
          <select
            className={field}
            value={origin.slug}
            disabled={moving}
            onChange={(e) => { setUserOrigin(e.target.value); startMove(() => router.push(`/flight-finder?from=${e.target.value}`)); }}
          >
            {ORIGINS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
          </select>
        </Field>
        <Field label="Going to">
          <select className={field} value={dest} onChange={(e) => setDest(e.target.value)}>
            <option value="">Anywhere</option>
            {dests.map(([slug, city]) => <option key={slug} value={slug}>{city}</option>)}
          </select>
        </Field>
        <div>
          <span className="font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trip length</span>
          <div className="flex h-12 items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {nightOpts.map((n) => (
              <button key={n} type="button" aria-pressed={nights === n} onClick={() => setNights(nights === n ? null : n)} className={`${seg(nights === n)} h-full flex-1 px-4`}>
                {n}N
              </button>
            ))}
          </div>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
          <button onClick={() => { setIntl(true); setDest(""); }} className={seg(intl)}>International ({counts.intl})</button>
          <button onClick={() => { setIntl(false); setDest(""); }} className={seg(!intl)}>Domestic ({counts.dom})</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
            <button onClick={() => setSort("cheapest")} className={seg(sort === "cheapest")}>Cheapest</button>
            <button onClick={() => setSort("shortest")} className={seg(sort === "shortest")}>Shortest flight</button>
          </div>
          <label className="font-label flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold">
            <input type="checkbox" checked={direct} onChange={(e) => setDirect(e.target.checked)} className="h-4 w-4 accent-[#8b1d24]" />
            Direct only
          </label>
        </div>
      </div>

      <section id="months" className="mt-6">
        <h2 className="font-label mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pick a month</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <button onClick={() => setMonth(null)} className={`shrink-0 rounded-xl border px-4 py-2 text-left transition ${month === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>
            <span className="font-label block text-sm font-semibold">Any month</span>
            <span className="block text-xs opacity-80">Best fares</span>
          </button>
          {months.filter((m) => monthMin[m] !== undefined).map((m) => (
            <button key={m} onClick={() => setMonth(m)} className={`shrink-0 rounded-xl border px-4 py-2 text-left transition ${month === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>
              <span className="font-label block text-sm font-semibold">{monthLabel(m)}</span>
              <span className="block text-xs opacity-80">from {inr(monthMin[m])}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="fares" className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{results.length} destinations</p>
          {ready && !user && (
            <Link href="/signup?next=/flight-finder" className="font-label flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground">
              🔒 Members unlock exact dates and price-drop alerts · ₹399/year →
            </Link>
          )}
          {user && alerts.length > 0 && (
            <p className="font-label text-xs font-semibold text-primary">🔔 {alerts.length} price alert{alerts.length > 1 ? "s" : ""} on</p>
          )}
        </div>

        {results.length === 0 ? (
          <p className="rounded-xl bg-muted p-6 text-muted-foreground">
            {rows.length === 0
              ? `Fares from ${origin.name} are being updated. Please check back shortly.`
              : "No flights match these filters. Try another month or trip length."}
          </p>
        ) : (
          <ul className={`grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${moving ? "opacity-50" : ""}`}>
            {results.map((f, i) => {
              const stops = formatStops(f.stops);
              const dur = formatDuration(f.mins);
              return (
                <li key={f.d} style={{ "--i": i } as CSSProperties} className="ticket-shell reveal group">
                  <div className="ticket" style={{ "--y": "9rem" } as CSSProperties}>
                  <div className="relative flex h-36 items-end justify-between p-4 text-white" style={{ background: gradientFor(f.d) }}>
                    <span className="font-label absolute left-4 top-4 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold">#{i + 1}</span>
                    <span className="font-label text-4xl font-bold tracking-wider">{f.code}</span>
                    {stops && <span className="font-label rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground">{stops}</span>}
                  </div>
                  <div className="ticket-perf p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold leading-tight">{f.city}</h3>
                        <p className="text-xs text-muted-foreground">{f.country}</p>
                      </div>
                      <PriceTag price={f.price} avg={avgByDest[f.d]} align="right" note="round trip" />
                    </div>
                    <dl className="font-label mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted p-3 text-center text-xs">
                      <div><dt className="text-muted-foreground">Flight</dt><dd className="mt-0.5 font-semibold">{dur ?? "—"}</dd></div>
                      <div><dt className="text-muted-foreground">Trip</dt><dd className="mt-0.5 font-semibold">{f.nights}N</dd></div>
                      <div><dt className="text-muted-foreground">Airline</dt><dd className="mt-0.5 truncate font-semibold">{f.airline || "—"}</dd></div>
                    </dl>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {user ? (
                        <>
                          <p className="font-label text-xs font-semibold">{formatRange(f.dep, f.ret)}</p>
                          <button
                            onClick={() => toggleAlert(f.d)}
                            aria-pressed={alerts.includes(f.d)}
                            className={`font-label whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${alerts.includes(f.d) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"}`}
                          >
                            {alerts.includes(f.d) ? "🔔 Alert on" : "🔔 Alert me"}
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="font-label select-none text-xs text-muted-foreground blur-[5px]" aria-hidden>{formatRange(f.dep, f.ret)}</p>
                          <Link href="/signup?next=/flight-finder" className="font-label whitespace-nowrap rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground">
                            🔒 Unlock dates
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          Round-trip fares in rupees{lastSeen ? `, last checked ${formatDay(lastSeen)}` : ""}. Prices change often, so confirm the final fare before you book.
        </p>
      </section>
    </main>
  );
}
