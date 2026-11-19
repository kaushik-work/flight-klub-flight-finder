"use client";

import Link from "next/link";
import { useState } from "react";
import { ORIGINS, type Route, inr, savingPct } from "@/lib/fares";

export default function SavingsCalc({ routes }: { routes: Route[] }) {
  const [origin, setOrigin] = useState(ORIGINS[0].slug);
  const [dest, setDest] = useState("");
  const [pax, setPax] = useState(2);
  const options = routes.filter((r) => r.o === origin && r.intl).sort((a, b) => a.city.localeCompare(b.city));
  const f = options.find((r) => r.d === dest);
  const saved = f ? Math.max(0, f.avg - f.price) * pax : 0;
  const sel = "font-label h-12 w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white outline-none focus:border-white/50 [&>option]:text-foreground";

  return (
    <div className="grid gap-6 rounded-3xl bg-[#040609] p-6 text-white sm:p-10 lg:grid-cols-2 lg:items-center">
      <div>
        <h2 className="text-2xl font-extrabold sm:text-3xl">Want to see how much you could save?</h2>
        <p className="mt-2 text-[#88909c]">Pick where you fly from and where to. We compare the best fare with the average for that route.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <select aria-label="Flying from" className={sel} value={origin} onChange={(e) => { setOrigin(e.target.value); setDest(""); }}>
            {ORIGINS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
          </select>
          <select aria-label="Destination" className={sel} value={dest} onChange={(e) => setDest(e.target.value)}>
            <option value="">Select a destination</option>
            {options.map((x) => <option key={x.d} value={x.d}>{x.city}</option>)}
          </select>
          <select aria-label="Travellers" className={`${sel} sm:col-span-2`} value={pax} onChange={(e) => setPax(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} traveller{n > 1 ? "s" : ""}</option>)}
          </select>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        {f ? (
          <>
            <p className="font-label text-xs uppercase tracking-wider text-[#88909c]">Estimated saving to {f.city}</p>
            <p className="mt-2 text-5xl font-extrabold text-[#e06b5a]">{inr(saved)}</p>
            <p className="mt-1 text-sm text-[#88909c]">{savingPct(f)}% below the route average · {pax} traveller{pax > 1 ? "s" : ""}</p>
            <Link href={`/flight-finder?from=${origin}&to=${f.d}`} className="font-label mt-5 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold hover:opacity-90">
              See {f.city} fares →
            </Link>
          </>
        ) : (
          <p className="text-[#88909c]">{options.length ? "Select a destination to see your savings." : "Fares are being updated."}</p>
        )}
      </div>
    </div>
  );
}
