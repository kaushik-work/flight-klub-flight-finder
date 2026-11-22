"use client";

// Sign-in is verified by Firebase (Google + SMS code). The profile, membership and price alerts mirror lives in
// localStorage until a server session and database replace it.
import { firebaseAuth } from "@/lib/firebase/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type User = { name: string; phone: string; city: string; email?: string; plan?: string; since?: string; renews?: string };

/** A price alert: tell the member when a fare on this route drops to the target price or lower. */
export type Alert = {
  id: string; // `${origin}:${dest}`, one alert per route
  origin: string; // origin slug
  dest: string; // destination slug
  city: string;
  code: string;
  target: number; // rupees
  createdAt: string;
};
export type AlertInput = Omit<Alert, "id" | "createdAt">;
export const alertId = (origin: string, dest: string) => `${origin}:${dest}`;

type Ctx = {
  ready: boolean;
  user: User | null;
  alerts: Alert[];
  login: (u: User) => void;
  updateUser: (patch: Partial<Pick<User, "name" | "city" | "email">>) => void;
  logout: () => void;
  setAlert: (a: AlertInput) => void;
  removeAlert: (id: string) => void;
};

const AuthCtx = createContext<Ctx | null>(null);
const KEY = "fk-session-v1";

// Older sessions stored alerts as plain destination slugs. Those had no target price, so they are dropped.
const validAlerts = (v: unknown): Alert[] =>
  Array.isArray(v) ? v.filter((a): a is Alert => !!a && typeof a === "object" && typeof (a as Alert).id === "string" && typeof (a as Alert).target === "number") : [];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setUser(s.user ?? null);
        setAlerts(validAlerts(s.alerts));
      }
    } catch {}
    // If the server says the cookie is gone or expired, drop the local copy too (a 503 means server auth is off).
    fetch("/api/session").then((r) => { if (r.status === 401) { setUser(null); setAlerts([]); try { localStorage.removeItem(KEY); } catch {} } }).catch(() => {});
    setReady(true);
  }, []);

  const save = (u: User | null, a: Alert[]) => {
    try {
      if (u) localStorage.setItem(KEY, JSON.stringify({ user: u, alerts: a }));
      else localStorage.removeItem(KEY);
    } catch {}
  };

  const login = useCallback((u: User) => { setUser(u); save(u, alerts); }, [alerts]);
  const updateUser = useCallback((patch: Partial<Pick<User, "name" | "city" | "email">>) => {
    if (!user) return;
    const next = { ...user, ...patch };
    setUser(next);
    save(next, alerts);
  }, [user, alerts]);
  const logout = useCallback(() => { void fetch("/api/session", { method: "DELETE" }).catch(() => {}); void firebaseAuth().signOut().catch(() => {}); setUser(null); setAlerts([]); save(null, []); }, []);

  const setAlert = useCallback((a: AlertInput) => {
    if (!user) return;
    const id = alertId(a.origin, a.dest);
    const existing = alerts.find((x) => x.id === id);
    const next = [{ ...a, id, createdAt: existing?.createdAt ?? new Date().toISOString() }, ...alerts.filter((x) => x.id !== id)];
    setAlerts(next);
    save(user, next);
  }, [user, alerts]);
  const removeAlert = useCallback((id: string) => {
    const next = alerts.filter((x) => x.id !== id);
    setAlerts(next);
    if (user) save(user, next);
  }, [user, alerts]);

  const value = useMemo(
    () => ({ ready, user, alerts, login, updateUser, logout, setAlert, removeAlert }),
    [ready, user, alerts, login, updateUser, logout, setAlert, removeAlert],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
