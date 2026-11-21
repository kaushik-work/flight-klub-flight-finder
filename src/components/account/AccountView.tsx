"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ArrowRight, Bell, Check } from "@/components/Icons";
import { destName, ORIGINS } from "@/lib/fares";
import { useHydrated, useNow } from "@/lib/useHydrated";

const DAY = 86_400_000;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const label = "mb-1 block text-xs font-medium text-muted-foreground";
const input =
  "h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[15px] font-medium outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

export default function AccountView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const now = useNow();
  const auth = useAuth();
  const user = hydrated ? auth.user : null;
  const alerts = hydrated ? auth.alerts : [];

  // Logged-out visitors are sent to log in, then brought back here.
  useEffect(() => {
    if (hydrated && auth.ready && !auth.user) router.replace("/login?next=/account");
  }, [hydrated, auth.ready, auth.user, router]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  if (!user) {
    return (
      <div className="pt-16" aria-busy="true">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-80 rounded-3xl" />
          <div className="skeleton h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Membership validity. "renews" is the end date; the start is stored when the member pays.
  const end = user.renews ? new Date(user.renews).getTime() : null;
  const start = user.since ? new Date(user.since).getTime() : end ? end - 365 * DAY : null;
  const left = end ? Math.ceil((end - now) / DAY) : null;
  const pct = end && start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 0;
  const status =
    left === null ? { t: "No active membership", c: "bg-white/20 text-white" }
    : left <= 0 ? { t: "Expired", c: "bg-red-100 text-red-700" }
    : left <= 30 ? { t: `Expires in ${left} day${left === 1 ? "" : "s"}`, c: "bg-amber-100 text-amber-800" }
    : { t: "Active", c: "bg-green-100 text-green-700" };

  function startEdit() {
    setName(user!.name); setCity(user!.city); setEmail(user!.email ?? ""); setErr({}); setSaved(false); setEditing(true);
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (name.trim().length < 2) er.name = "Enter your name";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) er.email = "Enter a valid email";
    setErr(er);
    if (Object.keys(er).length) return;
    auth.updateUser({ name: name.trim(), city, email: email.trim() || undefined });
    setEditing(false);
    setSaved(true);
  }

  return (
    <div className="pt-12 sm:pt-16">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">My account</h1>
      <p className="mt-2 text-muted-foreground">Your membership, your details and your price alerts.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Membership: a ticket, with validity below the tear line */}
        <section aria-labelledby="membership" className="ticket-shell reveal">
          <div className="ticket" style={{ "--y": "11.5rem" } as CSSProperties}>
            <div className="relative h-[11.5rem] bg-gradient-to-br from-[#8b1d24] to-[#c2453f] p-6 text-white">
              <span className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full border-[26px] border-white/15" aria-hidden />
              <p id="membership" className="t-label !text-[11px] text-white/80">Flight Klub membership</p>
              <p className="t-title mt-2 text-3xl">{left === null ? "Free account" : "Founding member"}</p>
              <p className="mt-1 text-sm text-white/85">{user.name}</p>
              <span className={`absolute bottom-5 left-6 rounded-full px-3 py-1 text-xs font-bold ${status.c}`}>{status.t}</span>
              <span className="absolute bottom-5 right-6 text-sm font-semibold text-white/90">₹399 / year</span>
            </div>
            <div className="ticket-perf p-6">
              {end ? (
                <>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Valid till</p>
                      <p className="t-title t-num text-3xl">{fmt(user.renews!)}</p>
                    </div>
                    <div className="text-right">
                      <p className="t-title t-num text-3xl text-price">{Math.max(0, left!)}</p>
                      <p className="text-xs text-muted-foreground">days left</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Membership year used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
                    <div className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#8b1d24]" style={{ width: `${pct}%` }} />
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-muted px-3 py-2.5"><dt className="text-[11px] text-muted-foreground">Member since</dt><dd className="mt-0.5 font-semibold">{start ? fmt(new Date(start).toISOString()) : "-"}</dd></div>
                    <div className="rounded-xl bg-muted px-3 py-2.5"><dt className="text-[11px] text-muted-foreground">Plan</dt><dd className="mt-0.5 font-semibold">1 year, ₹399</dd></div>
                  </dl>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {left! > 30 ? `Your membership runs until ${fmt(user.renews!)}.` : left! > 0 ? "Your membership is about to end. Renewal will open here." : "Your membership has ended, so dates and alerts are locked."}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You are logged in, but there is no active membership on this account. Membership starts when you complete payment at sign-up, and it unlocks exact travel dates and price-drop alerts.
                </p>
              )}
              <ul className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
                {["Exact travel dates on every fare", "Price-drop alerts on your routes", "Direct link to book each fare"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check className="text-price" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {/* Profile */}
          <section aria-labelledby="profile" className="ticket-shell reveal" style={{ "--i": 1 } as CSSProperties}>
            <div className="ticket p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="profile" className="t-title text-2xl">Profile</h2>
                {!editing && (
                  <button onClick={startEdit} className="font-label rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">Edit profile</button>
                )}
              </div>
              {saved && !editing && <p className="mt-3 flex items-center gap-2 rounded-xl bg-price-soft px-3 py-2 text-sm font-semibold text-price" role="status"><Check />Profile saved</p>}

              {editing ? (
                <form onSubmit={save} noValidate className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="p-name" className={label}>Full name</label>
                    <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} className={`${input} ${err.name ? "border-red-500" : ""}`} autoComplete="name" />
                    {err.name && <p className="mt-1 text-sm text-red-600" role="alert">{err.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="p-email" className={label}>Email (optional)</label>
                    <input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} ${err.email ? "border-red-500" : ""}`} autoComplete="email" />
                    {err.email && <p className="mt-1 text-sm text-red-600" role="alert">{err.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="p-city" className={label}>Flying from</label>
                    <select id="p-city" value={city} onChange={(e) => setCity(e.target.value)} className={input}>
                      {ORIGINS.map((o) => <option key={o.slug}>{o.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className={label}>Mobile number</span>
                    <div className="flex h-11 items-center justify-between rounded-xl border border-border bg-muted px-3.5 text-[15px] font-medium text-muted-foreground">
                      <span>+91 {user.phone}</span><span className="text-xs">Verified, can&apos;t be edited here</span>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button className="font-label h-11 flex-1 rounded-lg bg-primary text-sm font-bold text-primary-foreground transition hover:opacity-90">Save changes</button>
                    <button type="button" onClick={() => setEditing(false)} className="font-label h-11 rounded-lg border border-border px-5 text-sm font-semibold transition hover:bg-muted">Cancel</button>
                  </div>
                </form>
              ) : (
                <dl className="mt-5 divide-y divide-border text-sm">
                  {[
                    ["Name", user.name],
                    ["Mobile", `+91 ${user.phone}`, "Verified"],
                    ["Email", user.email || "Not added"],
                    ["Flying from", user.city],
                  ].map(([k, v, tag]) => (
                    <div key={k} className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="flex items-center gap-2 text-right font-semibold">
                        {v}{tag && <span className="rounded-full bg-price-soft px-2 py-0.5 text-[11px] font-bold text-price">{tag}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </section>

          {/* Alerts */}
          <section aria-labelledby="alerts" className="ticket-shell reveal" style={{ "--i": 2 } as CSSProperties}>
            <div className="ticket p-6">
              <h2 id="alerts" className="t-title flex items-center gap-2 text-2xl"><Bell className="text-primary" />Price alerts</h2>
              {alerts.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No alerts yet. Tap the bell on any fare in the{" "}
                  <Link href="/flight-finder" className="font-semibold text-primary underline underline-offset-4">flight finder</Link>.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {alerts.map((a) => (
                    <li key={a} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <Link href={`/flight-finder?from=${ORIGINS.find((o) => o.name === user.city)?.slug ?? "bangalore"}&to=${a}`} className="font-semibold hover:text-primary">
                        {user.city} to {destName(a)}<ArrowRight className="ml-1.5 text-muted-foreground" />
                      </Link>
                      <button onClick={() => auth.toggleAlert(a)} className="font-label rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-primary">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <button onClick={() => { auth.logout(); router.push("/"); }} className="font-label w-full rounded-xl border border-border bg-white py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary">Log out</button>
        </div>
      </div>
    </div>
  );
}
