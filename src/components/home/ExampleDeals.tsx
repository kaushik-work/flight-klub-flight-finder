import Link from "next/link";
import { ArrowRight } from "@/components/Icons";
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
              <div className="relative flex h-36 items-end justify-between p-5 text-white" style={{ background: gradientFor(r.d) }}>
                {pct > 0 && <span className="font-label absolute left-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-bold text-primary">{pct}% below average</span>}
                <span className="font-label absolute right-5 top-5 rounded-full bg-black/35 px-3 py-1 text-xs">Round trip</span>
                <div>
                  <p className="font-label text-xs opacity-80">From {from}</p>
                  <h3 className="t-title text-3xl">{r.city}</h3>
                </div>
                <span className="font-label text-lg font-bold tracking-widest opacity-60">{r.code}</span>
              </div>
              <div className="ticket-perf p-5">
                <div className="flex items-start justify-between gap-3">
                  <PriceTag price={r.price} avg={r.avg} size="lg" badge={false} />
                  {r.avg > r.price && (
                    <p className="font-label whitespace-nowrap rounded-lg bg-price-soft px-3 py-1.5 text-xs font-bold text-price">Save {inr(r.avg - r.price)}</p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5 text-xs font-medium">
                  {stops && <span className={`rounded-full px-2.5 py-1 ${r.stops === 0 ? "bg-price-soft text-price" : "bg-muted text-muted-foreground"}`}>{stops}</span>}
                  {r.airline && <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{r.airline}</span>}
                  <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Cheapest in {monthLabel(r.month)}</span>
                </div>
                <Link href="/signup" className="group/stub mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-secondary px-3.5 py-3 transition hover:border-primary hover:bg-primary hover:text-primary-foreground">
                  <span className="font-label select-none text-sm font-semibold blur-[5px] transition group-hover/stub:blur-[6px]" aria-hidden>{formatRange(r.dep, r.ret)}</span>
                  <span className="font-label whitespace-nowrap text-xs font-bold text-primary transition group-hover/stub:text-primary-foreground">Unlock dates<ArrowRight className="ml-1.5" /></span>
                </Link>
              </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-xs text-muted-foreground">Examples from recently observed fares. Prices change, so these are not live offers.</p>
      <div className="mt-6 text-center">
        <Link href="/signup" className="font-label inline-block rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
          Become a member · ₹399/year<ArrowRight className="ml-1.5" />
        </Link>
      </div>
    </section>
  );
}
