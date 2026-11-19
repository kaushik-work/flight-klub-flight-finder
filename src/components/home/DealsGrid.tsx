"use client";

import Link from "next/link";
import { useState } from "react";
import { ORIGINS, type Route, formatDuration, formatStops, gradientFor, inr, monthLabel, savingPct } from "@/lib/fares";

export default function DealsGrid({ routes }: { routes: Route[] }) {
  const have = ORIGINS.filter((o) => routes.some((r) => r.o === o.slug));
  const [origin, setOrigin] = useState(have[0]?.slug ?? ORIGINS[0].slug);
  const deals = routes.filter((r) => r.o === origin && r.intl).sort((a, b) => a.price - b.price).slice(0, 6);

  if (!have.length) {
    return <p className="rounded-xl bg-muted p-6 text-muted-foreground">Fares are being updated. Please check back shortly.</p>;
  }

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Flying from">
        {have.map((o) => (
          <button key={o.slug} role="tab" aria-selected={origin === o.slug} onClick={() => setOrigin(o.slug)}
            className={`font-label shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${origin === o.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>
            {o.name}
          </button>
        ))}
      </div>
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((f) => {
          const pct = savingPct(f);
          const stops = formatStops(f.stops);
          return (
            <li key={f.d}>
              <Link href={`/flight-finder?from=${origin}&to=${f.d}`}
                className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative flex h-40 items-end justify-between p-4 text-white" style={{ background: gradientFor(f.d) }}>
                  {pct > 0 && <span className="font-label absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-primary">{pct}% below average</span>}
                  <span className="font-label text-5xl font-bold tracking-wider">{f.code}</span>
                  {stops && <span className="font-label rounded-full bg-black/40 px-3 py-1 text-xs">{stops}</span>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{f.city}</h3>
                      <p className="text-xs text-muted-foreground">Round trip · {f.nights}N{formatDuration(f.mins) ? ` · ${formatDuration(f.mins)}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-primary">{inr(f.price)}</p>
                      {pct > 0 && <p className="text-xs text-muted-foreground">avg <span className="line-through">{inr(f.avg)}</span></p>}
                    </div>
                  </div>
                  <p className="font-label mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cheapest in {monthLabel(f.month)}</span>
                    <span className="font-bold text-primary transition group-hover:translate-x-1">See dates →</span>
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
