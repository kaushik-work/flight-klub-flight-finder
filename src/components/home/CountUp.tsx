"use client";

import { useEffect, useRef, useState } from "react";

/** A number that counts up to its value once, for a little life. Shows the final value without motion if the person prefers it. */
export default function CountUp({ to, ms = 900, className = "" }: { to: number; ms?: number; className?: string }) {
  const [n, setN] = useState(to);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ran.current = true;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <span className={`t-num ${className}`}>{n.toLocaleString("en-IN")}</span>;
}
