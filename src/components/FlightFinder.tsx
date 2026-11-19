"use client";

import { useMemo, useState } from "react";
import { FARES, MONTHS, ORIGINS, fareFor, inr, monthLabel } from "@/lib/fares";

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

export default function FlightFinder() {
  const [origin, setOrigin] = useState("Bangalore");
  const [intl, setIntl] = useState(true);
  const [dest, setDest] = useState("");
  const [nights, setNights] = useState<number | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [sort, setSort] = useState<"cheapest" | "shortest">("cheapest");
  const [direct, setDirect] = useState(false);

  const pool = useMemo(() => FARES.filter((f) => f.intl === intl), [intl]);

  const monthMin = useMemo(
    () => Object.fromEntries(MONTHS.map((m) => [m, Math.min(...pool.map((f) => fareFor(f, m, nights).price))])),
    [pool, nights],
  );

  const results = useMemo(() => {
    let r = pool.map((f) => fareFor(f, month, nights));
    if (dest) r = r.filter((f) => f.code === dest);
    if (direct) r = r.filter((f) => f.stops === 0);
    return r.sort((a, b) => (sort === "cheapest" ? a.price - b.price : a.hours - b.hours));
  }, [pool, dest, direct, sort, month, nights]);

  const counts = { intl: FARES.filter((f) => f.intl).length, dom: FARES.filter((f) => !f.intl).length };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10">
      <section className="pt-10 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {intl ? "International" : "Domestic"} flights from {origin}
        </h1>
        <p className="mt-2 text-muted-foreground">Cheapest destinations and months, ranked by recent round-trip fares.</p>
      </section>

      {/* Search bar */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end"
      >
        <Field label="Flying from">
          <select className={field} value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {ORIGINS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Going to">
          <select className={field} value={dest} onChange={(e) => setDest(e.target.value)}>
            <option value="">Anywhere</option>
            {pool.map((f) => <option key={f.code} value={f.code}>{f.city}</option>)}
          </select>
        </Field>
        <div>
          <span className="font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trip length</span>
          <div className="flex h-12 items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {[3, 5, 7].map((n) => (
              <button key={n} type="button" onClick={() => setNights(nights === n ? null : n)} className={`${seg(nights === n)} h-full flex-1 px-4`}>
                {n}N
              </button>
            ))}
          </div>
        </div>
        <button className="font-label h-12 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98]">
          Search
        </button>
      </form>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
          <button onClick={() => { setIntl(true); setDest(""); }} className={seg(intl)}>International ({counts.intl})</button>
          <button onClick={() => { setIntl(false); setDest(""); }} className={seg(!intl)}>Domestic ({counts.dom})</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
            <button onClick={() => setSort("cheapest")} className={seg(sort === "cheapest")}>Cheapest</button>
            <button onClick={() => setSort("shortest")} className={seg(sort === "shortest")}>Shortest trip</button>
          </div>
          <label className="font-label flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold">
            <input type="checkbox" checked={direct} onChange={(e) => setDirect(e.target.checked)} className="h-4 w-4 accent-[#8b1d24]" />
            Direct only
          </label>
        </div>
      </div>

      {/* Month chips */}
      <section id="months" className="mt-6">
        <h2 className="font-label mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pick a month</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <button onClick={() => setMonth(null)} className={`shrink-0 rounded-xl border px-4 py-2 text-left transition ${month === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>
            <span className="font-label block text-sm font-semibold">Any month</span>
            <span className="block text-xs opacity-80">Best fares</span>
          </button>
          {MONTHS.map((m) => (
            <button key={m} onClick={() => setMonth(m)} className={`shrink-0 rounded-xl border px-4 py-2 text-left transition ${month === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>
              <span className="font-label block text-sm font-semibold">{monthLabel(m)}</span>
              <span className="block text-xs opacity-80">from {inr(monthMin[m])}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      <section id="fares" className="mt-6">
        <p className="mb-4 text-sm text-muted-foreground">{results.length} destinations</p>
        {results.length === 0 ? (
          <p className="rounded-xl bg-muted p-6 text-muted-foreground">No flights match these filters.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((f, i) => (
              <li key={f.code} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative flex h-36 items-end justify-between p-4 text-white" style={{ background: f.gradient }}>
                  <span className="font-label absolute left-4 top-4 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold">#{i + 1}</span>
                  <span className="font-label text-4xl font-bold tracking-wider">{f.code}</span>
                  <span className="font-label rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground">
                    {f.stops === 0 ? "Direct" : `${f.stops} stop`}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">{f.city}</h3>
                      <p className="text-xs text-muted-foreground">{f.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold leading-tight text-primary">{inr(f.price)}</p>
                      <p className="text-[11px] text-muted-foreground">round trip</p>
                    </div>
                  </div>
                  <dl className="font-label mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted p-3 text-center text-xs">
                    <div><dt className="text-muted-foreground">Flight</dt><dd className="mt-0.5 font-semibold">{f.hours}h</dd></div>
                    <div><dt className="text-muted-foreground">Trip</dt><dd className="mt-0.5 font-semibold">{f.nights}N</dd></div>
                    <div><dt className="text-muted-foreground">Airline</dt><dd className="mt-0.5 truncate font-semibold">{f.airline}</dd></div>
                  </dl>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-label text-xs text-muted-foreground">{f.dates}</p>
                    <button className="font-label rounded-lg bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                      Details →
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs text-muted-foreground">Indicative fares, not a live quote. Taxes and baggage may vary.</p>
      </section>
    </main>
  );
}
