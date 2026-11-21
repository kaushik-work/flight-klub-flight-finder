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
