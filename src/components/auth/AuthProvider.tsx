"use client";

// Sign-in is verified by Firebase (Google + SMS code). The profile, membership and price alerts mirror lives in
// localStorage until a server session and database replace it.
import { firebaseAuth } from "@/lib/firebase/client";
import { addMonths } from "@/lib/site";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** One card (destination + trip length) whose exact dates were unlocked for a week. */
export type CardUnlock = { key: string; until: string };
/** The one-time trial: up to TRIAL_UNLOCKS cards at TRIAL_PRICE each. Only accounts that chose it have this. */
export type Trial = { bought: number; unlocks: CardUnlock[] };
export type User = { name: string; phone: string; city: string; email?: string; plan?: string; since?: string; renews?: string; trial?: Trial };

export const TRIAL_UNLOCKS = 3;
export const TRIAL_PRICE = 89; // rupees per card, GST included
export const TRIAL_DAYS = 7;
const DAY_MS = 86_400_000;

export const cardKey = (origin: string, dest: string, nights: number) => `${origin}:${dest}:${nights}`;

/**
 * A member sees every date. Before the trial existed (and for a plain login in this demo) an account is a member;
 * an account that chose the trial is one only while a paid plan is running.
 */
export function isMember(user: User | null, now = Date.now()): boolean {
  if (!user) return false;
  if (user.plan) return !user.renews || new Date(user.renews).getTime() > now;
  return !user.trial;
}
export const unlockedUntil = (user: User | null, key: string, now = Date.now()): number | null => {
  const u = user?.trial?.unlocks.find((x) => x.key === key);
  const t = u ? new Date(u.until).getTime() : 0;
  return t > now ? t : null;
};
/** Trial unlocks still available to buy: 3 minus every one ever bought, active or not. */
export const trialLeft = (user: User | null) => (user?.trial ? Math.max(0, TRIAL_UNLOCKS - user.trial.bought) : 0);

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
  /** Record a paid card unlock (7 days). Returns false when the trial is used up or the card is already open. */
  unlockCard: (key: string) => boolean;
  /** Record a paid plan on this account. */
  buyPlan: (months: number, planId: string) => void;
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
  const unlockCard = useCallback((key: string) => {
    if (!user?.trial || trialLeft(user) === 0 || unlockedUntil(user, key)) return false;
    const until = new Date(Date.now() + TRIAL_DAYS * DAY_MS).toISOString();
    const next: User = { ...user, trial: { bought: user.trial.bought + 1, unlocks: [...user.trial.unlocks.filter((x) => x.key !== key), { key, until }] } };
    setUser(next);
    save(next, alerts);
    return true;
  }, [user, alerts]);
  const buyPlan = useCallback((months: number, planId: string) => {
    if (!user) return;
    const now = new Date();
    const end = addMonths(now, months);
    const next: User = { ...user, plan: planId, since: now.toISOString(), renews: end.toISOString() };
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
    () => ({ ready, user, alerts, login, updateUser, unlockCard, buyPlan, logout, setAlert, removeAlert }),
    [ready, user, alerts, login, updateUser, unlockCard, buyPlan, logout, setAlert, removeAlert],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
