import { MEMBERSHIP_LABEL, SIGNUP_LIMIT, SIGNUPS_FULL, SPOTS_LEFT } from "@/lib/site";

export default function LimitBadge({ dark = false, bar = false }: { dark?: boolean; bar?: boolean }) {
  const tone = dark ? "border-white/15 bg-white/10 text-white" : "border-primary/20 bg-secondary text-secondary-foreground";
  const text = SIGNUPS_FULL
    ? "Founding spots are full. Join the waitlist"
    : SPOTS_LEFT !== null
      ? `Only ${SPOTS_LEFT.toLocaleString("en-IN")} of ${SIGNUP_LIMIT.toLocaleString("en-IN")} founding spots left`
      : `Founding membership · ${MEMBERSHIP_LABEL} · first ${SIGNUP_LIMIT.toLocaleString("en-IN")} members`;
  const pct = SPOTS_LEFT === null ? 0 : ((SIGNUP_LIMIT - SPOTS_LEFT) / SIGNUP_LIMIT) * 100;
  return (
    <div className="inline-block">
      <span className={`font-label inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${tone}`}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e06b5a] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#d33a3c]" />
        </span>
        {text}
      </span>
      {bar && SPOTS_LEFT !== null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuemin={0} aria-valuemax={SIGNUP_LIMIT} aria-valuenow={SIGNUP_LIMIT - SPOTS_LEFT} aria-label="Founding spots claimed">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
