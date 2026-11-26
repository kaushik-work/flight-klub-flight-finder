import { inrIf } from "@/lib/fares";

/**
 * Where a fare sits between the lowest and highest we have seen for the same trip length. The green stretch runs
 * from this fare up to the average, so its length is the saving. Plain track, no gradient, so it stays quiet.
 */
export default function PriceRange({ price, min, avg, max, label, masked = false }: { masked?: boolean; price: number; min: number; avg: number; max: number; label: string }) {
  if (!(max > min)) return null;
  const at = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const from = at(price);
  const to = at(avg);
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="t-num">average {inrIf(!masked, avg)}</span>
      </div>
      <div className="relative mt-2.5 h-1.5 rounded-full bg-muted" role="img" aria-label={masked ? "Fare range, unlock to see prices" : `Fare range ${inrIf(true, min)} to ${inrIf(true, max)}, average ${inrIf(true, avg)}`}>
        {to > from && <span className="absolute inset-y-0 rounded-full bg-price/35" style={{ left: `${from}%`, width: `${to - from}%` }} />}
        <span className="absolute -top-1 h-3.5 w-0.5 rounded bg-foreground/35" style={{ left: `${to}%` }} title="Average" />
        <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-price shadow" style={{ left: `${from}%` }} />
      </div>
      <div className="t-num mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>Lowest {inrIf(!masked, min)}</span>
        <span>Highest {inrIf(!masked, max)}</span>
      </div>
    </div>
  );
}
