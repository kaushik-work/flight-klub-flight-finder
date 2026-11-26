"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "@/components/Icons";
import { useState } from "react";
import DestinationPicker from "@/components/DestinationPicker";
import { useHomeOrigin } from "@/components/location/LocationProvider";
import { DESTINATIONS, ORIGINS } from "@/lib/fares";

const field =
  "font-label h-12 w-full appearance-none rounded-xl border border-border bg-white pl-4 pr-10 text-sm font-semibold outline-none transition hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10";

export default function HeroSearch({ nightOptions = [3, 5, 7], destinations }: { nightOptions?: number[]; destinations?: { slug: string; city: string; country?: string; intl: boolean }[] }) {
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

  // Destinations come from the stored fares, so new ones (China, Srinagar, Port Blair...) appear once they are scraped.
  const source = destinations?.length ? destinations : DESTINATIONS;
  const list = source.filter((f) => f.intl === intl && f.slug !== from).sort((a, b) => a.city.localeCompare(b.city));

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
    <form onSubmit={go} className="grid gap-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[1fr_1fr_auto_auto]">
      <div>
        <span className={label}>Flying from</span>
        <DestinationPicker
          value={from}
          onChange={(slug) => slug && setFrom(slug)}
          anywhere={null}
          grouped={false}
          showCountry={false}
          searchPlaceholder="Search your city"
          options={ORIGINS.map((o) => ({ slug: o.slug, city: o.name, country: "India", code: o.code }))}
        />
      </div>
      <div>
        <span className={label}>Going to</span>
        <DestinationPicker
          value={to}
          onChange={setTo}
          options={list.map((f) => ({ slug: f.slug, city: f.city, country: f.country ?? (f.intl ? "International" : "India") }))}
          anywhere={intl ? "All destinations abroad" : "All cities in India"}
        />
      </div>
      <div>
        <span className={label}>Trip length</span>
        <div className="flex h-12 gap-1 rounded-xl border border-border bg-muted p-1">
          {nightOptions.map((n) => (
            <button key={n} type="button" aria-pressed={nights === n} onClick={() => setNights(nights === n ? null : n)}
              className={`font-label flex-1 rounded-lg px-4 text-sm font-semibold transition ${nights === n ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {n}N
            </button>
          ))}
        </div>
      </div>
      <button className="font-label h-12 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98]">
        Find cheap flights<ArrowRight className="ml-1.5" />
      </button>
    </form>
    </div>
  );
}
