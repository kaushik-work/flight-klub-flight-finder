/** A hand-drawn wavy underline that draws itself. Put it inside a `relative` element. */
export default function Squiggle({ color = "#f59e0b", className = "" }: { color?: string; className?: string }) {
  return (
    <svg className={`squiggle absolute -bottom-1.5 left-0 h-2 w-full ${className}`} viewBox="0 0 100 8" preserveAspectRatio="none" fill="none" aria-hidden>
      <path d="M2 5 Q 12 0 22 5 T 42 5 T 62 5 T 82 5 T 98 5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
