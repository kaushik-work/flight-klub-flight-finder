"use client";

// Asks for the visitor's location once on load and picks the nearest departure city we cover.
// Coordinates are used in the browser only: they are never sent anywhere or stored. Only the chosen
// city's slug is kept (localStorage), and a city the visitor picks themselves always wins over the guess.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ORIGINS, findOrigin, nearestOrigin } from "@/lib/fares";

type Ctx = { origin: string | null; setUserOrigin: (slug: string) => void };
const LocationCtx = createContext<Ctx>({ origin: null, setUserOrigin: () => {} });

const KEY = "fk-origin-v1";
const RETRY_AFTER_MS = 7 * 24 * 3600 * 1000;

type Saved = { slug?: string; src?: "geo" | "user" | "default"; askedAt?: number };
const FALLBACK = "bangalore"; // used whenever location is denied, unavailable or outside our cities
const read = (): Saved => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const write = (v: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [origin, setOrigin] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const saved = read();
    if (saved.slug && findOrigin(saved.slug)) setOrigin(saved.slug);
    if (saved.src === "user") return; // their own choice always wins
    const fallback = () => {
      if (saved.src === "geo" && saved.slug) return; // keep an earlier good guess through a timeout
      setOrigin(FALLBACK);
      write({ slug: FALLBACK, src: "default", askedAt: Date.now() });
    };
    if (!("geolocation" in navigator)) { fallback(); return; }
    if ((!saved.slug || saved.src === "default") && saved.askedAt && Date.now() - saved.askedAt < RETRY_AFTER_MS) {
      setOrigin(FALLBACK); // declined recently: do not ask again yet
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const o = nearestOrigin(pos.coords.latitude, pos.coords.longitude);
        if (!o) { fallback(); return; }
        write({ slug: o.slug, src: "geo", askedAt: Date.now() });
        setOrigin(o.slug);
        if (saved.slug !== o.slug) setToast(o.name);
      },
      () => fallback(),
      { maximumAge: 3_600_000, timeout: 10_000, enableHighAccuracy: false },
    );
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const setUserOrigin = useCallback((slug: string) => {
    if (!ORIGINS.some((o) => o.slug === slug)) return;
    setOrigin(slug);
    write({ slug, src: "user", askedAt: Date.now() });
  }, []);

  const value = useMemo(() => ({ origin, setUserOrigin }), [origin, setUserOrigin]);

  return (
    <LocationCtx.Provider value={value}>
      {children}
      {toast && (
        <div role="status" className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl sm:left-auto sm:right-4 sm:mx-0">
          <span aria-hidden className="text-xl">📍</span>
          <p className="flex-1 text-sm">
            <span className="font-bold">Showing flights from {toast}</span>
            <span className="block text-muted-foreground">Your nearest airport we cover. Change it any time in the search box.</span>
          </p>
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}
    </LocationCtx.Provider>
  );
}

export const useHomeOrigin = () => useContext(LocationCtx);
