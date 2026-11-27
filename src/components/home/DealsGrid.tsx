"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "@/components/Icons";
import GateModal from "@/components/auth/GateModal";
import { isMember, useAuth } from "@/components/auth/AuthProvider";
import { useHydrated } from "@/lib/useHydrated";
import type { GateCard } from "@/lib/gate";
import { useState, type CSSProperties } from "react";
import PriceTag from "@/components/PriceTag";
import { useHomeOrigin } from "@/components/location/LocationProvider";
import { ORIGINS, type Route, formatDuration, formatStops, gradientFor, monthLabel, savingPct } from "@/lib/fares";

export default function DealsGrid({ routes }: { routes: Route[] }) {
  const hydrated = useHydrated();
  const auth = useAuth();
  const user = hydrated ? auth.user : null;
  const member = isMember(user);
  // A visitor taps a deal and gets the plan popup for it; anyone logged in goes to that fare in the finder, where they unlock it or already have it.
  const [gateFor, setGateFor] = useState<GateCard | null>(null);
  const have = ORIGINS.filter((o) => routes.some((r) => r.o === o.slug));
  const { origin: near } = useHomeOrigin();
  const [picked, setOrigin] = useState<string | null>(null);
  const origin = picked ?? (near && have.some((o) => o.slug === near) ? near : have[0]?.slug) ?? ORIGINS[0].slug;
  const [intl, setIntl] = useState(true);
  const deals = routes.filter((r) => r.o === origin && r.intl === intl).sort((a, b) => a.price - b.price).slice(0, 6);

  if (!have.length) {
    return <p className="rounded-xl bg-muted p-6 text-muted-foreground">Fares are being updated. Please check back shortly.</p>;
  }

  return (
    <div>
      <div role="tablist" aria-label="Trip type" className="mb-4 inline-flex gap-1 rounded-xl border border-border bg-muted p-1">
        {([[true, "International"], [false, "Domestic"]] as const).map(([v, t]) => (
          <button key={t} role="tab" aria-selected={intl === v} onClick={() => setIntl(v)}
            className={`font-label h-9 rounded-lg px-4 text-sm font-semibold transition ${intl === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Flying from">
        {have.map((o) => (
          <button key={o.slug} role="tab" aria-selected={origin === o.slug} onClick={() => setOrigin(o.slug)}
            className={`font-label shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${origin === o.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>
            {o.name}
          </button>
        ))}
      </div>
      {deals.length === 0 && (
        <p className="mt-5 rounded-xl bg-muted p-6 text-muted-foreground">No {intl ? "international" : "domestic"} fares from this city right now.</p>
      )}
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((f, idx) => {
          const pct = savingPct(f);
          const stops = formatStops(f.stops);
          return (
            <li key={f.d} style={{ "--i": idx } as CSSProperties} className="ticket-shell reveal">
              {user ? (
                <Link href={`/flight-finder?from=${origin}&to=${f.d}&nights=${f.nights}`} style={{ "--y": "10rem" } as CSSProperties} className="ticket group block">
                <div className="relative flex h-40 items-end justify-between p-4 text-white" style={{ background: gradientFor(f.d) }}>
                  {pct > 0 && <span className="font-label absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-primary">{pct}% below average</span>}
                  <span className="font-label text-lg font-bold tracking-widest opacity-60">{f.code}</span>
                  {stops && <span className="font-label rounded-full bg-black/40 px-3 py-1 text-xs">{stops}</span>}
                </div>
                <div className="ticket-perf p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{f.city}</h3>
                      <p className="text-xs text-muted-foreground">Round trip · {f.nights}N{formatDuration(f.mins) ? ` · ${formatDuration(f.mins)}` : ""}</p>
                    </div>
                    <PriceTag masked={!member} price={f.price} avg={f.avg} align="right" badge={false} />
                  </div>
                  <p className="font-label mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cheapest in {monthLabel(f.month)}</span>
                    {member
                      ? <span className="font-bold text-primary transition group-hover:translate-x-1">See dates<ArrowRight className="ml-1.5" /></span>
                      : <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 font-bold text-primary-foreground"><Lock className="mr-1.5 h-3.5 w-3.5" />Unlock price</span>}
                  </p>
                </div>
              </Link>
              ) : (
                <button type="button" onClick={() => setGateFor({ origin, originName: ORIGINS.find((o) => o.slug === origin)?.name ?? origin, dest: f.d, city: f.city, code: f.code, nights: f.nights, price: f.price, avg: f.avg })}
                  style={{ "--y": "10rem" } as CSSProperties} className="ticket group block w-full text-left">
                <div className="relative flex h-40 items-end justify-between p-4 text-white" style={{ background: gradientFor(f.d) }}>
                  {pct > 0 && <span className="font-label absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-primary">{pct}% below average</span>}
                  <span className="font-label text-lg font-bold tracking-widest opacity-60">{f.code}</span>
                  {stops && <span className="font-label rounded-full bg-black/40 px-3 py-1 text-xs">{stops}</span>}
                </div>
                <div className="ticket-perf p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{f.city}</h3>
                      <p className="text-xs text-muted-foreground">Round trip · {f.nights}N{formatDuration(f.mins) ? ` · ${formatDuration(f.mins)}` : ""}</p>
                    </div>
                    <PriceTag masked={!member} price={f.price} avg={f.avg} align="right" badge={false} />
                  </div>
                  <p className="font-label mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cheapest in {monthLabel(f.month)}</span>
                    {member
                      ? <span className="font-bold text-primary transition group-hover:translate-x-1">See dates<ArrowRight className="ml-1.5" /></span>
                      : <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 font-bold text-primary-foreground"><Lock className="mr-1.5 h-3.5 w-3.5" />Unlock price</span>}
                  </p>
                </div>
              </button>
              )}
            </li>
          );
        })}
      </ul>
      {gateFor && <GateModal card={gateFor} onClose={() => setGateFor(null)} />}
    </div>
  );
}
