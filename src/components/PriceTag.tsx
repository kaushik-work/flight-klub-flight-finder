import { inr } from "@/lib/fares";

/** Trending-down arrow: the "price dropped" symbol used everywhere a fare is below its average. */
export function DropIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3 7 6.5 6.5 4-4L21 17" />
      <path d="M15 17h6v-6" />
    </svg>
  );
}

export const dropPct = (price: number, avg?: number | null) => (avg && avg > price ? Math.round((1 - price / avg) * 100) : 0);

/**
 * A fare. When it is below the route's average it turns green, shows a down arrow, strikes out the average
 * and says how much lower it is. Otherwise it is a plain price.
 */
export default function PriceTag({
  price, avg, size = "md", align = "left", note,
}: { price: number; avg?: number | null; size?: "md" | "lg" | "xl"; align?: "left" | "right"; note?: string }) {
  const off = dropPct(price, avg);
  const text = { md: "text-xl", lg: "text-2xl", xl: "text-4xl" }[size];
  const row = align === "right" ? "justify-end" : "";
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p className={`t-title t-num flex items-center gap-1.5 leading-tight ${row} ${text} ${off > 0 ? "text-price" : ""}`}>
        {off > 0 && <DropIcon className={size === "xl" ? "h-7 w-7" : "h-5 w-5"} />}
        {inr(price)}
      </p>
      {off > 0 && avg && (
        <p className={`t-num mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground ${row}`}>
          <s className="decoration-[#dc2626]/70 decoration-2">{inr(avg)}</s>
          <span className="inline-flex items-center gap-1 rounded-full bg-price-soft px-2 py-0.5 font-bold text-price">
            <DropIcon className="h-3 w-3" />{off}% lower
          </span>
        </p>
      )}
      {note && <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
