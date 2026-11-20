import Link from "next/link";
import PriceTag from "@/components/PriceTag";
import type { CSSProperties } from "react";
import { ORIGINS, type Route, formatRange, formatStops, gradientFor, inr, monthLabel, savingPct } from "@/lib/fares";

// Examples built from the real fares we hold. No member names or quotes: nothing here is a real person's claim.
const PICKS = ["bangkok", "dubai", "singapore", "london", "tokyo", "bali"];

export default function ExampleDeals({ routes }: { routes: Route[] }) {
  const deals = PICKS.map((slug, i) => {
    const o = ORIGINS[i % ORIGINS.length];
    const r = routes.find((x) => x.d === slug && x.o === o.slug) ?? routes.filter((x) => x.d === slug).sort((a, b) => a.price - b.price)[0];
    return r ? { r, from: ORIGINS.find((x) => x.slug === r.o)!.name } : null;
  }).filter((x): x is { r: Route; from: string } => !!x);

  if (!deals.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <p className="font-label text-xs font-semibold uppercase tracking-widest text-primary">Example deals</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">What a member sees</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Recent round-trip fares from different cities, with the saving against the route average worked out for you.
        Members also get the exact dates and an alert when the price drops.
      </p>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map(({ r, from }, idx) => {
          const pct = savingPct(r);
          const stops = formatStops(r.stops);
          return (
            <li key={`${r.o}-${r.d}`} style={{ "--i": idx } as CSSProperties} className="ticket-shell reveal">
              <div className="ticket" style={{ "--y": "9rem" } as CSSProperties}>
              <div className="relative flex h-36 items-end justify-between p-4 text-white" style={{ background: gradientFor(r.d) }}>
                {pct > 0 && <span className="font-label absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-primary">{pct}% off avg</span>}
                <span className="font-label absolute right-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs">Round trip</span>
                <div>
                  <p className="font-label text-xs opacity-80">{from} →</p>
                  <h3 className="text-2xl font-extrabold leading-tight">{r.city}</h3>
                </div>
                <span className="font-label text-3xl font-bold tracking-wider opacity-90">{r.code}</span>
              </div>
              <div className="ticket-perf p-4">
                <div className="flex items-end justify-between">
                  <PriceTag price={r.price} avg={r.avg} size="lg" />
                  {r.avg > r.price && (
                    <p className="font-label rounded-lg bg-price-soft px-3 py-1.5 text-xs font-bold text-price">Save {inr(r.avg - r.price)}</p>
                  )}
                </div>
                <p className="font-label mt-3 text-xs text-muted-foreground">
                  {[stops, r.airline, `cheapest in ${monthLabel(r.month)}`].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-border bg-muted px-3 py-2.5">
                  <span className="font-label select-none text-xs blur-[5px]" aria-hidden>{formatRange(r.dep, r.ret)}</span>
                  <span className="font-label text-xs font-semibold text-muted-foreground">🔒 Dates for members</span>
                </div>
              </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-xs text-muted-foreground">Examples from recently observed fares. Prices change, so these are not live offers.</p>
      <div className="mt-6 text-center">
        <Link href="/signup" className="font-label inline-block rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
          Become a member · ₹399/year →
        </Link>
      </div>
    </section>
  );
}
