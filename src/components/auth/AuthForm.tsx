"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ORIGINS } from "@/lib/fares";
import LimitBadge from "@/components/LimitBadge";
import { MEMBERSHIP_LABEL, MEMBERSHIP_PRICE, SIGNUP_LIMIT, SIGNUPS_FULL } from "@/lib/site";
import { useAuth } from "./AuthProvider";
import OtpInput from "./OtpInput";

type Mode = "login" | "signup";

const input =
  "font-label h-12 w-full rounded-xl border bg-white px-4 text-sm font-semibold outline-none transition placeholder:font-normal placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";
const label = "font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

const perks = [
  ["Exact travel dates", "See the dates behind every low fare."],
  ["Price-drop alerts", "Tap the bell on any route and we flag it when it drops."],
  ["Saved routes", "Your cities and destinations, ready next time."],
  ["One simple price", "₹399 a year for the first 1,000 founding members."],
];

export default function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const { login, user, ready } = useAuth();
  const signup = mode === "signup";
  const waitlist = signup && SIGNUPS_FULL;

  const [step, setStep] = useState<"details" | "otp" | "pay" | "done">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [agree, setAgree] = useState(true);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("upi");
  const [wait, setWait] = useState(0);

  useEffect(() => { if (ready && user && step !== "done") router.replace(next); }, [ready, user, step, next, router]);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  function validate() {
    const e: Record<string, string> = {};
    if (signup && name.trim().length < 2) e.name = "Enter your name";
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "Enter a valid 10-digit mobile number";
    if (signup && !agree) e.agree = "Please accept to continue";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  function sendOtp(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setTimeout(() => { setBusy(false); setStep("otp"); setOtp(""); setErr({}); setWait(30); }, 600);
  }

  function verify(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (otp.length !== 6) { setErr({ otp: "Enter the 6-digit code" }); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (waitlist) { setStep("done"); return; }
      if (signup) { setStep("pay"); return; }
      login({ name: "Member", phone, city });
      setStep("done");
      setTimeout(() => router.push(next), 900);
    }, 600);
  }

  function google() {
    if (waitlist) return;
    setName("Google user");
    if (signup) { setStep("pay"); return; }
    login({ name: "Google user", phone: "", city });
    setStep("done");
    setTimeout(() => router.push(next), 900);
  }

  // Demo checkout: no payment is taken. Swap for Razorpay (create order, open checkout, verify) later.
  function pay() {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const renews = new Date(); renews.setFullYear(renews.getFullYear() + 1);
      login({ name: name.trim() || "Member", phone, city, renews: renews.toISOString() });
      setStep("done");
      setTimeout(() => router.push(next), 1100);
    }, 900);
  }

  const bad = (k: string) => (err[k] ? "border-red-500" : "border-border");

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-[#040609] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#8b1d24]/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#d33a3c]/20 blur-3xl" />
        <div className="relative">
          <p className="font-label text-xs font-semibold uppercase tracking-widest text-[#e06b5a]">Flight Klub</p>
          <h2 className="mt-4 max-w-md text-4xl font-extrabold leading-tight">
            {signup ? (waitlist ? "Founding spots are full. Get on the list." : `Founding membership. First ${SIGNUP_LIMIT.toLocaleString("en-IN")} members only.`) : "Welcome back. Your next fare is waiting."}
          </h2>
          <ul className="mt-10 space-y-5">
            {perks.map(([t, d]) => (
              <li key={t} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold">✓</span>
                <span><span className="block font-bold">{t}</span><span className="text-sm text-[#b6bcc6]">{d}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-[#88909c]">Stop searching. Start saving.</p>
      </aside>

      {/* Form */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-md">
          {step === "done" ? (
            <div className="text-center" role="status">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl text-white">✓</div>
              <h1 className="mt-5 text-2xl font-extrabold">{waitlist ? "You're on the waitlist" : signup ? "Welcome, member!" : "Logged in"}</h1>
              <p className="mt-1 text-muted-foreground">{waitlist ? "We'll message you as soon as a spot opens up." : "Taking you to the fares…"}</p>
            </div>
          ) : (
            <>
              <Image src="/flight-klub.svg" alt="Flight Klub" width={240} height={120} className="-ml-3 -mt-3 h-20 w-auto lg:hidden" />
              <h1 className="text-3xl font-extrabold tracking-tight">
                {step === "pay" ? "Complete your membership" : step === "otp" ? "Verify your number" : waitlist ? "Join the waitlist" : signup ? "Become a member" : "Log in"}
              </h1>
              {signup && step === "details" && <div className="mt-4"><LimitBadge bar /></div>}
              <p className="mt-2 text-muted-foreground">
                {step === "pay"
                  ? "One payment unlocks everything for a year."
                  : step === "otp"
                  ? `We sent a 6-digit code to +91 ${phone}.`
                  : signup ? "Unlock exact dates and price-drop alerts for ₹399 a year." : "Enter your mobile number to continue."}
              </p>

              {step === "pay" ? (
                <div className="mt-8 space-y-5">
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold">Flight Klub Membership</p>
                        <p className="text-xs text-muted-foreground">1 year · Founding member</p>
                      </div>
                      <p className="text-2xl font-extrabold text-primary">₹{MEMBERSHIP_PRICE}</p>
                    </div>
                    <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                      {["Exact travel dates on every fare", "Price-drop alerts on your routes", "Saved cities and destinations"].map((t) => (
                        <li key={t} className="flex gap-2"><span className="font-bold text-primary">✓</span>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <fieldset>
                    <legend className={label}>Pay with</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {[["upi", "UPI"], ["card", "Card"], ["netbanking", "Net banking"]].map(([v, t]) => (
                        <label key={v} className={`font-label flex h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition ${method === v ? "border-primary bg-secondary text-secondary-foreground ring-4 ring-primary/10" : "border-border bg-white hover:border-primary/50"}`}>
                          <input type="radio" name="method" value={v} checked={method === v} onChange={() => setMethod(v)} className="sr-only" />
                          {t}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <button onClick={pay} disabled={busy} className="font-label h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60">
                    {busy ? "Processing…" : `Pay ₹${MEMBERSHIP_PRICE} for 1 year →`}
                  </button>
                  <p className="text-center text-xs text-muted-foreground">Demo checkout: no payment is taken yet. Secure checkout will open here.</p>
                  <button type="button" onClick={() => setStep("details")} className="font-label block w-full text-center text-sm font-semibold text-muted-foreground hover:text-primary">← Back</button>
                </div>
              ) : step === "details" ? (
                <form onSubmit={sendOtp} noValidate className="mt-8 space-y-5">
                  {signup && (
                    <div>
                      <label htmlFor="name" className={label}>Full name</label>
                      <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="As on your ID" className={`${input} ${bad("name")}`} aria-invalid={!!err.name} />
                      {err.name && <p className="mt-1 text-xs text-red-600" role="alert">{err.name}</p>}
                    </div>
                  )}
                  <div>
                    <label htmlFor="phone" className={label}>Mobile number</label>
                    <div className={`flex overflow-hidden rounded-xl border bg-white transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 ${bad("phone")}`}>
                      <span className="font-label flex items-center border-r border-border bg-muted px-4 text-sm font-semibold">🇮🇳 +91</span>
                      <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="98765 43210"
                        className="font-label h-12 w-full bg-transparent px-4 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70" aria-invalid={!!err.phone} />
                    </div>
                    {err.phone && <p className="mt-1 text-xs text-red-600" role="alert">{err.phone}</p>}
                  </div>
                  {signup && (
                    <div>
                      <label htmlFor="city" className={label}>Flying from</label>
                      <select id="city" value={city} onChange={(e) => setCity(e.target.value)} className={`${input} border-border`}>
                        {ORIGINS.map((o) => <option key={o.slug}>{o.name}</option>)}
                      </select>
                    </div>
                  )}
                  {signup && (
                    <div>
                      <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8b1d24]" />
                        <span>Send me fare alerts on WhatsApp and SMS. I agree to the terms and privacy policy.</span>
                      </label>
                      {err.agree && <p className="mt-1 text-xs text-red-600" role="alert">{err.agree}</p>}
                    </div>
                  )}
                  <button disabled={busy} className="font-label h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60">
                    {busy ? "Sending code…" : waitlist ? "Join waitlist →" : "Continue →"}
                  </button>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
                  <button type="button" onClick={google} className="font-label flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-white text-sm font-semibold transition hover:border-primary/50 hover:bg-muted">
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
                    Continue with Google
                  </button>
                </form>
              ) : (
                <form onSubmit={verify} className="mt-8 space-y-5">
                  <div>
                    <span className={label}>Enter code</span>
                    <OtpInput value={otp} onChange={(v) => { setOtp(v); setErr({}); }} invalid={!!err.otp} />
                    {err.otp && <p className="mt-2 text-xs text-red-600" role="alert">{err.otp}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">Demo mode: any 6 digits will work.</p>
                  </div>
                  <button disabled={busy} className="font-label h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60">
                    {busy ? "Verifying…" : waitlist ? "Verify & join waitlist" : signup ? "Verify & continue to payment" : "Verify & log in"}
                  </button>
                  <div className="font-label flex items-center justify-between text-sm">
                    <button type="button" onClick={() => { setStep("details"); setOtp(""); setErr({}); }} className="font-semibold text-muted-foreground hover:text-primary">← Change number</button>
                    {wait > 0
                      ? <span className="text-muted-foreground">Resend in {wait}s</span>
                      : <button type="button" onClick={() => sendOtp()} className="font-semibold text-primary hover:underline">Resend code</button>}
                  </div>
                </form>
              )}

              <p className="mt-8 text-center text-sm text-muted-foreground">
                {signup ? "Already have an account? " : "New to Flight Klub? "}
                <Link href={`${signup ? "/login" : "/signup"}?next=${encodeURIComponent(next)}`} className="font-bold text-primary hover:underline">
                  {signup ? "Log in" : "Sign up"}
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
