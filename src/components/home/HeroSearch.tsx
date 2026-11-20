"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHomeOrigin } from "@/components/location/LocationProvider";
import { DESTINATIONS, ORIGINS } from "@/lib/fares";

const field =
  "font-label h-12 w-full appearance-none rounded-xl border border-border bg-white pl-4 pr-10 text-sm font-semibold outline-none transition hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10";

export default function HeroSearch() {
  const router = useRouter();
  const { origin: near, setUserOrigin } = useHomeOrigin();
  const [picked, setFrom] = useState<string | null>(null);
  const from = picked ?? near ?? ORIGINS[0].slug;
  const [to, setTo] = useState("");
  const [intl, setIntl] = useState(true);
  const [nights, setNights] = useState<number | null>(null);

  function go(e: React.FormEvent) {
    e.preventDefault();
    setUserOrigin(from);
    const q = new URLSearchParams({ from });
    if (to) q.set("to", to);
    if (nights) q.set("nights", String(nights));
    router.push(`/flight-finder?${q}`);
  }

  const label = "font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  const list = DESTINATIONS.filter((f) => f.intl === intl && f.slug !== from);

  return (
    <div className="rounded-2xl bg-white p-4 text-foreground shadow-2xl shadow-black/30">
    <div role="tablist" aria-label="Trip type" className="mb-4 inline-flex gap-1 rounded-xl border border-border bg-muted p-1">
      {([[true, "International"], [false, "Domestic"]] as const).map(([v, t]) => (
        <button key={t} type="button" role="tab" aria-selected={intl === v} onClick={() => { setIntl(v); setTo(""); }}
          className={`font-label h-9 rounded-lg px-4 text-sm font-semibold transition ${intl === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {t}
        </button>
      ))}
    </div>
    <form onSubmit={go} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
      <label className="block">
        <span className={label}>Flying from</span>
        <select className={field} value={from} onChange={(e) => setFrom(e.target.value)}>
          {ORIGINS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className={label}>Going to</span>
        <select className={field} value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">{intl ? "Anywhere abroad (show me the cheapest)" : "Anywhere in India (show me the cheapest)"}</option>
          {list.map((f) => <option key={f.slug} value={f.slug}>{f.city}</option>)}
        </select>
      </label>
      <div>
        <span className={label}>Trip length</span>
        <div className="flex h-12 gap-1 rounded-xl border border-border bg-muted p-1">
          {[3, 5, 7].map((n) => (
            <button key={n} type="button" aria-pressed={nights === n} onClick={() => setNights(nights === n ? null : n)}
              className={`font-label flex-1 rounded-lg px-4 text-sm font-semibold transition ${nights === n ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {n}N
            </button>
          ))}
        </div>
      </div>
      <button className="font-label h-12 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98]">
        Find cheap flights →
      </button>
    </form>
    </div>
  );
}
