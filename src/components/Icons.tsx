// One small stroke icon set so ticks, arrows, bells and locks match everywhere (no text glyphs or emoji).
type P = { className?: string };
const base = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.3,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};
// Inline icons sit on the text baseline and scale with the font size.
const inline = "inline-block h-[1.1em] w-[1.1em] shrink-0 align-[-0.17em]";

export const Check = ({ className = "" }: P) => <svg {...base} className={`${inline} ${className}`}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const ArrowRight = ({ className = "" }: P) => <svg {...base} className={`${inline} ${className}`}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const ArrowUpRight = ({ className = "" }: P) => <svg {...base} className={`${inline} ${className}`}><path d="M7 17 17 7M8.5 7H17v8.5" /></svg>;
export const Bell = ({ className = "" }: P) => (
  <svg {...base} strokeWidth={2} className={`${inline} ${className}`}><path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5Z" /><path d="M10 19.5a2.2 2.2 0 0 0 4 0" /></svg>
);
export const Lock = ({ className = "" }: P) => (
  <svg {...base} strokeWidth={2} className={`${inline} ${className}`}><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
);
// Alert switched on: a solid bell with ringing marks, so it reads differently from the outline bell at a glance.
export const BellOn = ({ className = "" }: P) => (
  <svg {...base} strokeWidth={2} className={`${inline} ${className}`}>
    <path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5Z" fill="currentColor" />
    <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
    <path d="M3 8.5A9 9 0 0 1 5.5 4M21 8.5A9 9 0 0 0 18.5 4" />
  </svg>
);

/** The site's tick: a bold tick in a solid round badge. Used everywhere a tick appears so they all match. */
const BADGE_TONE = { coral: "bg-[#e06b5a] text-white", green: "bg-price text-white", primary: "bg-primary text-white", white: "bg-white text-primary" };
const BADGE_SIZE = { xs: ["h-4 w-4", "h-2.5 w-2.5"], sm: ["h-5 w-5", "h-3 w-3"], lg: ["h-14 w-14", "h-7 w-7"] };
export const CheckBadge = ({ tone = "coral", size = "sm", className = "" }: { tone?: keyof typeof BADGE_TONE; size?: keyof typeof BADGE_SIZE; className?: string }) => (
  <span className={`inline-flex shrink-0 items-center justify-center rounded-full align-[-0.2em] ${BADGE_SIZE[size][0]} ${BADGE_TONE[tone]} ${className}`} aria-hidden>
    <svg viewBox="0 0 24 24" className={BADGE_SIZE[size][1]} fill="none" stroke="currentColor" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
  </span>
);
