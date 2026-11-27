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

/** "mumbai:bali:5" as "Mumbai to Bali, 5 nights", for lists. */
export function cardLabel(key: string): string {
  const [o = "", d = "", n = ""] = key.split(":");
  const t = (x: string) => x.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return `${t(o)} to ${t(d)}, ${n} nights`;
}
export const cardKey = (origin: string, dest: string, nights: number) => `${origin}:${dest}:${nights}`;

/**
 * A member is someone whose paid plan is running. Logging in with a mobile number alone does NOT make anyone a member:
 * until 27 Nov 2026 an account without a trial marker counted as one (a leftover from when sign-up always meant paying),
 * so a plain login saw every date for free. Everyone without an active plan is on the trial instead (see ensureTrial).
 */
export function isMember(user: User | null, now = Date.now()): boolean {
  if (!user?.plan) return false;
  return !user.renews || new Date(user.renews).getTime() > now;
}
/** Gives an account that has no running plan the (empty) trial, so it is offered the ₹89 unlock and the plans. */
export function ensureTrial(u: User): User {
  return isMember(u) || u.trial ? u : { ...u, trial: { bought: 0, unlocks: [] } };
}
export const unlockedUntil = (user: User | null, key: string, now = Date.now()): number | null => {
  const t = Math.max(0, ...(user?.trial?.unlocks ?? []).filter((x) => x.key === key).map((x) => new Date(x.until).getTime()));
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
  /** Log in. An alert can be passed to be placed in the same step (the fare a visitor unlocked). */
  login: (u: User, alert?: AlertInput) => void;
  updateUser: (patch: Partial<Pick<User, "name" | "city" | "email">>) => void;
  /** Record a paid card unlock (7 days) in the database. Resolves to an error message, or null when it worked. */
  unlockCard: (key: string) => Promise<string | null>;
  /** Record a paid plan on this account. */
  buyPlan: (months: number, planId: string) => void;
  /** Take the trial state the server returned after a verified payment. */
  applyTrial: (trial: Trial) => void;
  /** Take the plan the server returned after a verified payment (or found on the account at load). */
  applyPlan: (plan: { id: string; since?: string | null; renews: string }) => void;
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
        setUser(s.user ? ensureTrial(s.user as User) : null);
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

  const login = useCallback((u: User, alert?: AlertInput) => {
    const next = alert ? [{ ...alert, id: alertId(alert.origin, alert.dest), createdAt: new Date().toISOString() }, ...alerts.filter((x) => x.id !== alertId(alert.origin, alert.dest))] : alerts;
    const account = ensureTrial(u);
    setUser(account);
    setAlerts(next);
    save(account, next);
  }, [alerts]);
  const updateUser = useCallback((patch: Partial<Pick<User, "name" | "city" | "email">>) => {
    if (!user) return;
    const next = { ...user, ...patch };
    setUser(next);
    save(next, alerts);
  }, [user, alerts]);
  const withTrial = useCallback((trial: Trial) => {
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, trial };
      save(next, alerts);
      return next;
    });
  }, [alerts]);

  const applyPlan = useCallback((plan: { id: string; since?: string | null; renews: string }) => {
    setUser((u) => {
      if (!u) return u;
      const next: User = { ...u, plan: plan.id, since: plan.since ?? u.since, renews: plan.renews };
      save(next, alerts);
      return next;
    });
  }, [alerts]);
  // The database is the record: on load (and after login) take the trial from the server, so the unlocks used and the
  // cards opened are the same on every device and survive a cleared browser.
  const phone = user?.phone;
  useEffect(() => {
    if (!phone) return;
    let live = true;
    fetch("/api/unlocks").then((r) => (r.ok ? r.json() : null)).then((d) => { if (live && d?.trial) withTrial(d.trial as Trial); }).catch(() => {});
    fetch("/api/members").then((r) => (r.ok ? r.json() : null)).then((d) => { if (live && d?.plan) applyPlan(d.plan); }).catch(() => {});
    return () => { live = false; };
  }, [phone, withTrial, applyPlan]);

  const unlockCard = useCallback(async (key: string): Promise<string | null> => {
    if (!user?.trial) return "Trial is not available on this account.";
    if (unlockedUntil(user, key)) return null;
    try {
      const r = await fetch("/api/unlocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
      if (r.ok) { withTrial((await r.json()).trial as Trial); return null; }
      if (r.status === 409) { const d = await r.json().catch(() => null); if (d?.trial) withTrial(d.trial as Trial); return `All ${TRIAL_UNLOCKS} trial unlocks are used. Choose a plan to see more dates.`; }
      if (r.status === 401 || r.status === 403) return "Please log in again to unlock dates.";
      if (r.status !== 503) return "Could not record the unlock. Nothing was charged. Please try again.";
    } catch { return "Could not reach the server. Nothing was charged. Please try again."; }
    // 503: server login is not set up (local demo), so the trial stays in this browser.
    if (trialLeft(user) === 0) return `All ${TRIAL_UNLOCKS} trial unlocks are used. Choose a plan to see more dates.`;
    const until = new Date(Date.now() + TRIAL_DAYS * DAY_MS).toISOString();
    withTrial({ bought: user.trial.bought + 1, unlocks: [...user.trial.unlocks.filter((x) => x.key !== key), { key, until }] });
    return null;
  }, [user, withTrial]);
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
    () => ({ ready, user, alerts, login, updateUser, unlockCard, buyPlan, applyTrial: withTrial, applyPlan, logout, setAlert, removeAlert }),
    [ready, user, alerts, login, updateUser, unlockCard, buyPlan, withTrial, applyPlan, logout, setAlert, removeAlert],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
