import Link from "next/link";
import { DropIcon } from "@/components/PriceTag";
import { inr } from "@/lib/fares";

export type TickerDeal = { o: string; from: string; d: string; city: string; price: number; pct: number };

/** A slow scrolling strip of the biggest drops below route average in our data. Pauses on hover. */
export default function DealTicker({ deals }: { deals: TickerDeal[] }) {
  if (deals.length < 4) return null;
  const row = (dup: boolean) =>
    deals.map((d) => (
      <Link
        key={`${dup ? "b" : "a"}-${d.o}-${d.d}`}
        href={`/flight-finder?from=${d.o}&to=${d.d}`}
        tabIndex={dup ? -1 : 0}
        aria-hidden={dup || undefined}
        className="mr-3 inline-flex shrink-0 items-center gap-2.5 rounded-md border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white backdrop-blur transition hover:border-white/40 hover:bg-white/20"
      >
        <span className="font-semibold">{d.from} to {d.city}</span>
        <span className="t-num font-extrabold text-[#8ff0a9]">{inr(d.price)}</span>
        <span className="inline-flex items-center gap-1 rounded bg-[#22c55e]/25 px-2 py-0.5 text-xs font-bold text-[#8ff0a9]"><DropIcon className="h-3 w-3" />{d.pct}%</span>
      </Link>
    ));
  return (
    <div className="relative mt-10 overflow-hidden" aria-label="Biggest drops below average right now">
      <p className="t-label mb-3 !text-[11px] text-[#e06b5a]">Biggest drops below average</p>
      <div className="[mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <div className="marquee">{row(false)}{row(true)}</div>
      </div>
    </div>
  );
}
