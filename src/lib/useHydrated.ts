"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False on the server and during hydration, true afterwards. Anything that depends on the browser
 * (a login stored in localStorage, for example) should wait for this, so the first client render
 * matches the server HTML and React does not report a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** The current time in milliseconds, or 0 on the server and during hydration. Updates once a minute. */
export function useNow(): number {
  return useSyncExternalStore(
    (cb) => { const t = setInterval(cb, 60_000); return () => clearInterval(t); },
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0,
  );
}
