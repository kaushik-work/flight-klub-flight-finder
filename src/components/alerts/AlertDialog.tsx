"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { alertId, isMember, useAuth } from "@/components/auth/AuthProvider";
import { ArrowRight, Bell, CheckBadge, Lock } from "@/components/Icons";
import { inr } from "@/lib/fares";
import { MEMBERSHIP_LABEL } from "@/lib/site";
import { useHydrated } from "@/lib/useHydrated";

export type AlertRoute = {
  origin: string; originName: string; dest: string; city: string; code: string;
  price?: number; // today's cheapest fare, when we have one
  avg?: number; // the route's average
};

const round100 = (n: number) => Math.max(100, Math.round(n / 100) * 100);

/**
 * Where a member sets the price they are waiting for on one route. Visitors see the same screen locked,
 * with the option to unlock alerts.
 */
export default function AlertDialog({ route, onClose, onUpgrade }: { route: AlertRoute; onClose: () => void; onUpgrade?: () => void }) {
  const hydrated = useHydrated();
  const auth = useAuth();
  const account = hydrated ? auth.user : null;
  // Alerts are a member feature; an account on the date-unlock trial sees them locked until it buys a plan.
  const user = account && isMember(account) ? account : null;
  const existing = auth.alerts.find((a) => a.id === alertId(route.origin, route.dest));
  const [target, setTarget] = useState(String(existing?.target ?? (route.price ? round100(route.price * 0.9) : "")));
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [onClose]);

  const value = Number(target.replace(/\D/g, ""));
  const presets: [string, number][] = route.price
    ? [["Today's fare", route.price], ["5% lower", round100(route.price * 0.95)], ["10% lower", round100(route.price * 0.9)], ["15% lower", round100(route.price * 0.85)]]
    : [];
  const gap = route.price && value ? route.price - value : 0;

  function save() {
    if (!value || value < 1000) { setErr("Enter the price you are waiting for, at least ₹1,000."); return; }
    auth.setAlert({ origin: route.origin, dest: route.dest, city: route.city, code: route.code, target: value });
    setSaved(true);
    setErr("");
  }

  const next = encodeURIComponent("/alerts");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-labelledby="alert-title" className="page-enter relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="t-label flex items-center gap-1.5 !text-[11px] text-primary"><Bell />Price alert</p>
            <h2 id="alert-title" className="t-title mt-1.5 text-2xl">{route.originName} to {route.city}</h2>
          </div>
          <button ref={close} onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-lg text-muted-foreground transition hover:bg-muted">×</button>
        </div>

        {route.price && (
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-muted px-4 py-3"><p className="text-[11px] text-muted-foreground">Cheapest today</p><p className="t-title t-num mt-0.5 text-xl">{inr(route.price)}</p></div>
            <div className="rounded-2xl bg-muted px-4 py-3"><p className="text-[11px] text-muted-foreground">Route average</p><p className="t-title t-num mt-0.5 text-xl">{route.avg ? inr(route.avg) : "-"}</p></div>
          </div>
        )}

        <div className="relative mt-5">
          <div className={user ? "" : "pointer-events-none select-none blur-[3px]"} aria-hidden={!user}>
            <label htmlFor="alert-target" className="text-sm font-semibold">Alert me when the fare drops to</label>
            <div className="mt-2 flex h-14 items-center rounded-2xl border border-border bg-white px-4 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <span className="text-xl font-bold text-muted-foreground">₹</span>
              <input
                id="alert-target"
                inputMode="numeric"
                value={value ? value.toLocaleString("en-IN") : ""}
                onChange={(e) => { setTarget(e.target.value); setSaved(false); setErr(""); }}
                placeholder="0"
                disabled={!user}
                className="t-num ml-2 h-full w-full bg-transparent text-2xl font-extrabold outline-none"
              />
            </div>
            {presets.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {presets.map(([label, v]) => (
                  <button key={label} type="button" disabled={!user} onClick={() => { setTarget(String(v)); setSaved(false); setErr(""); }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${value === v ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/50"}`}>
                    {label} · {inr(v)}
                  </button>
                ))}
              </div>
            )}
            {value > 0 && route.price && (
              <p className="mt-3 text-sm text-muted-foreground">
                {gap > 0 ? <>That is <span className="font-semibold text-price">{inr(gap)} ({Math.round((gap / route.price) * 100)}%) below</span> today&apos;s fare.</> : "Today's fare is already at or below this, so you would be alerted straight away."}
              </p>
            )}
            {user && <p className="mt-3 text-xs text-muted-foreground">We will message +91 {user.phone} when a fare for this route reaches your price.</p>}
            {err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}
          </div>

          {!user && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/60 p-4 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white"><Lock /></span>
              <p className="t-title mt-3 text-lg">Alerts are for members</p>
              <p className="mt-1 text-sm text-muted-foreground">Set your price and we tell you the moment a fare reaches it.</p>
            </div>
          )}
        </div>

        {user ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button onClick={save} className="font-label flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-primary-foreground transition hover:opacity-90">
              {saved ? <><CheckBadge tone="white" size="sm" />Alert saved</> : existing ? "Update alert" : "Set alert"}
            </button>
            {existing && (
              <button onClick={() => { auth.removeAlert(existing.id); onClose(); }} className="font-label h-12 rounded-xl border border-border px-5 text-sm font-semibold text-muted-foreground transition hover:border-red-300 hover:text-red-600">Remove</button>
            )}
          </div>
        ) : (
          account && onUpgrade ? (
            <div className="mt-5">
              <button onClick={onUpgrade} className="font-label flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-primary-foreground transition hover:opacity-90">
                Get a plan for alerts<ArrowRight className="ml-1.5" />
              </button>
            </div>
          ) : (
          <div className="mt-5">
            <Link href={`/signup?next=${next}`} className="font-label flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-primary-foreground transition hover:opacity-90">
              Unlock alerts · {MEMBERSHIP_LABEL}<ArrowRight className="ml-1.5" />
            </Link>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Already a member? <Link href={`/login?next=${next}`} className="font-semibold text-primary hover:underline">Log in</Link>
            </p>
          </div>
          )
        )}
        {saved && user && (
          <p className="mt-3 text-center text-sm">
            <Link href="/alerts" className="font-semibold text-primary hover:underline">See all your alerts<ArrowRight className="ml-1.5" /></Link>
          </p>
        )}
      </div>
    </div>
  );
}
