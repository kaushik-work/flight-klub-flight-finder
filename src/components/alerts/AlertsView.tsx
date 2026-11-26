"use client";

import Link from "next/link";
import { type CSSProperties, useState } from "react";
import AlertDialog, { type AlertRoute } from "@/components/alerts/AlertDialog";
import { type Alert, useAuth } from "@/components/auth/AuthProvider";
import { ArrowRight, Bell, BellOn, CheckBadge, Lock } from "@/components/Icons";
import { inr, ORIGINS } from "@/lib/fares";
import { MEMBERSHIP_LABEL } from "@/lib/site";
import { useHydrated } from "@/lib/useHydrated";

export type RouteFare = { o: string; d: string; city: string; code: string; price: number; avg: number };

const originName = (slug: string) => ORIGINS.find((o) => o.slug === slug)?.name ?? slug;

export default function AlertsView({ routes }: { routes: RouteFare[] }) {
  const hydrated = useHydrated();
  const auth = useAuth();
  const user = hydrated ? auth.user : null;
  const alerts = hydrated ? auth.alerts : [];
  const [editing, setEditing] = useState<AlertRoute | null>(null);

  if (!hydrated || !auth.ready) {
    return (
      <div className="pt-16" aria-busy="true">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton mt-8 h-44 rounded-3xl" />
      </div>
    );
  }

  const fare = (a: Alert) => routes.find((r) => r.o === a.origin && r.d === a.dest);
  function edit(a: Alert) {
    const f = fare(a);
    setEditing({ origin: a.origin, originName: originName(a.origin), dest: a.dest, city: a.city, code: a.code, price: f?.price, avg: f?.avg });
  }

  return (
    <div className="pt-12 sm:pt-16">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Price alerts</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">Set the price you are waiting for on a route, and we tell you when a fare reaches it.</p>

      {!user ? (
        // Visitors: a preview of an alert, locked, with the way in.
        <div className="mt-8">
          <div className="relative ticket-shell">
            <div className="ticket p-6" style={{ "--y": "70%" } as CSSProperties}>
              <div className="pointer-events-none select-none blur-[4px]" aria-hidden>
                <p className="t-title text-2xl">Bangalore to Bangkok</p>
                <p className="mt-3 text-sm text-muted-foreground">Alert me at</p>
                <p className="t-title t-num text-4xl text-price">₹17,500</p>
                <p className="mt-2 text-sm text-muted-foreground">Cheapest today ₹19,133</p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 p-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white"><Lock className="h-5 w-5" /></span>
                <p className="t-title mt-3 text-2xl">Unlock price alerts</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Members choose a target price on any route and get alerted when fares reach it. {MEMBERSHIP_LABEL}.</p>
                <Link href="/login?next=/alerts" className="font-label mt-5 inline-flex h-12 items-center rounded-xl bg-primary px-8 text-[15px] font-bold text-primary-foreground transition hover:opacity-90">
                  Unlock alerts<ArrowRight className="ml-1.5" />
                </Link>
                <p className="mt-3 text-sm text-muted-foreground">Already a member? <Link href="/login?next=/alerts" className="font-semibold text-primary hover:underline">Log in</Link></p>
              </div>
            </div>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="ticket-shell mt-8">
          <div className="ticket p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary"><Bell className="h-6 w-6" /></span>
            <p className="t-title mt-4 text-2xl">No alerts yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Open the flight finder, tap the bell on a fare and set the price you are waiting for.</p>
            <Link href="/flight-finder" className="font-label mt-5 inline-flex h-12 items-center rounded-xl bg-primary px-8 text-[15px] font-bold text-primary-foreground transition hover:opacity-90">
              Find a fare<ArrowRight className="ml-1.5" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {alerts.map((a, i) => {
              const f = fare(a);
              const hit = !!f && f.price <= a.target;
              const away = f ? f.price - a.target : 0;
              return (
                <li key={a.id} className="ticket-shell reveal" style={{ "--i": i } as CSSProperties}>
                  <div className="ticket" style={{ "--y": "calc(100% - 4.5rem)" } as CSSProperties}>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <p className="t-title text-xl">{originName(a.origin)} to {a.city}</p>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${hit ? "bg-price-soft text-price" : "bg-muted text-muted-foreground"}`}>
                          {hit ? <><CheckBadge tone="green" size="xs" className="mr-1.5" />Target reached</> : f ? "Waiting" : "No fare yet"}
                        </span>
                      </div>
                      <p className="mt-4 text-xs text-muted-foreground">Alert me at or below</p>
                      <p className="t-title t-num text-4xl text-price">{inr(a.target)}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {f
                          ? hit ? <>Cheapest now is <span className="font-semibold text-price">{inr(f.price)}</span>, under your price.</> : <>Cheapest now is {inr(f.price)}, <span className="font-semibold text-foreground">{inr(away)}</span> above your price.</>
                          : "We do not have a current fare for this route."}
                      </p>
                    </div>
                    <div className="ticket-perf flex h-[4.5rem] items-center justify-between gap-3 px-6">
                      <Link href={`/flight-finder?from=${a.origin}&to=${a.dest}`} className="font-label text-sm font-semibold text-primary hover:underline">View fares<ArrowRight className="ml-1.5" /></Link>
                      <div className="flex gap-2">
                        <button onClick={() => edit(a)} className="font-label rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">Edit</button>
                        <button onClick={() => auth.removeAlert(a.id)} className="font-label rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-red-600">Remove</button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><BellOn className="text-primary" />Alerts are for {alerts.length} route{alerts.length > 1 ? "s" : ""}. Add more from any fare in the <Link href="/flight-finder" className="font-semibold text-primary underline underline-offset-4">flight finder</Link>.</p>
        </>
      )}

      {editing && <AlertDialog route={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
