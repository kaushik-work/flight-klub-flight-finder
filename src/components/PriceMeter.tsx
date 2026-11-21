/** Where a fare sits between the cheapest and dearest we have seen for the route. Left is cheap. */
export default function PriceMeter({ price, min, avg, max }: { price: number; min: number; avg: number; max: number }) {
  if (!(max > min)) return null;
  const at = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const lowest = price <= min;
  const below = avg > price ? Math.round((1 - price / avg) * 100) : 0;
  const label = lowest ? "Lowest we have seen on this route" : below > 0 ? `${below}% below this route's average` : "Around this route's average";
  const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  return (
    <div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-[#22c55e] via-[#facc15] to-[#ef4444]" role="img" aria-label={label}>
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#14161c] shadow" style={{ left: `${at(price)}%` }} />
        <span className="absolute -top-0.5 h-3 w-px bg-[#14161c]/40" style={{ left: `${at(avg)}%` }} title="Average" aria-hidden />
      </div>
      <div className="t-num mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{fmt(min)}</span>
        <span className={lowest || below > 0 ? "font-semibold text-price" : ""}>{label}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}
