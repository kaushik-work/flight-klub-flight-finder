"use client";

// Sign-in is verified by Firebase (Google + SMS code). The profile and membership mirror lives in localStorage until
// a server session (Firebase Admin + httpOnly cookie) replaces it.
import { firebaseAuth } from "@/lib/firebase/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type User = { name: string; phone: string; city: string; email?: string; renews?: string };

type Ctx = {
  ready: boolean;
  user: User | null;
  alerts: string[];
  login: (u: User) => void;
  logout: () => void;
  toggleAlert: (code: string) => void;
};

const AuthCtx = createContext<Ctx | null>(null);
const KEY = "fk-session-v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setUser(s.user ?? null);
        setAlerts(Array.isArray(s.alerts) ? s.alerts : []);
      }
    } catch {}
    // If the server says the cookie is gone or expired, drop the local copy too (a 503 means server auth is off).
    fetch("/api/session").then((r) => { if (r.status === 401) { setUser(null); setAlerts([]); try { localStorage.removeItem(KEY); } catch {} } }).catch(() => {});
    setReady(true);
  }, []);

  const save = (u: User | null, a: string[]) => {
    try {
      if (u) localStorage.setItem(KEY, JSON.stringify({ user: u, alerts: a }));
      else localStorage.removeItem(KEY);
    } catch {}
  };

  const login = useCallback((u: User) => { setUser(u); save(u, alerts); }, [alerts]);
  const logout = useCallback(() => { void fetch("/api/session", { method: "DELETE" }).catch(() => {}); void firebaseAuth().signOut().catch(() => {}); setUser(null); setAlerts([]); save(null, []); }, []);
  const toggleAlert = useCallback((code: string) => {
    setAlerts((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      if (user) save(user, next);
      return next;
    });
  }, [user]);

  const value = useMemo(() => ({ ready, user, alerts, login, logout, toggleAlert }), [ready, user, alerts, login, logout, toggleAlert]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
