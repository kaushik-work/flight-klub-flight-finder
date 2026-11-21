"use client";

import Link from "next/link";
import { Check } from "@/components/Icons";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider, PhoneAuthProvider, RecaptchaVerifier, linkWithCredential, signInWithPhoneNumber, signInWithPopup,
  type ConfirmationResult,
} from "firebase/auth";
import { authMessage, firebaseAuth, startSession } from "@/lib/firebase/client";
import { ORIGINS } from "@/lib/fares";
import { EMAIL, MEMBERSHIP_PRICE, SIGNUP_LIMIT, SIGNUPS_FULL } from "@/lib/site";
import PriceTag from "@/components/PriceTag";
import type { Sample } from "./sample";
import { useAuth } from "./AuthProvider";
import OtpInput from "./OtpInput";

type Mode = "login" | "signup";

const primaryBtn =
  "h-12 w-full rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60";

function Ticket({ s }: { s: Sample }) {
  return (
    <div className="ticket-shell">
      <div className="ticket text-foreground" style={{ "--y": "calc(100% - 6rem)" } as React.CSSProperties}>
        <div className="p-6">
          <p className="text-xs font-medium text-muted-foreground">Cheapest round trip we found</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="t-title text-3xl">{s.from}</p>
              <p className="text-xs text-muted-foreground">{s.fromCity}</p>
            </div>
            <div className="flex flex-1 items-center gap-1 text-muted-foreground/50" aria-hidden>
              <span className="h-px flex-1 border-t border-dashed border-current" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-primary"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="rotate(90 12 12)" /></svg>
              <span className="h-px flex-1 border-t border-dashed border-current" />
            </div>
            <div className="text-right">
              <p className="t-title text-3xl">{s.to}</p>
              <p className="text-xs text-muted-foreground">{s.toCity}</p>
            </div>
          </div>
          <div className="mt-6"><PriceTag price={s.price} avg={s.avg} size="xl" /></div>
        </div>
        <div className="ticket-perf flex h-24 items-center justify-between px-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Travel dates</p>
            <p className="select-none text-lg font-bold tracking-widest text-muted-foreground/60" aria-hidden>•• ••• – •• •••</p>
          </div>
          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Members only</span>
        </div>
      </div>
    </div>
  );
}

const ico = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const IconPhone = () => <svg {...ico}><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>;
const IconUser = () => <svg {...ico}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" /></svg>;
const IconPin = () => <svg {...ico}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></svg>;

// A field with an icon, a divider and a small label above the value.
function Field({ icon, label, invalid, ok, children }: { icon: React.ReactNode; label: string; invalid?: boolean; ok?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex cursor-text items-center gap-3 rounded-xl border bg-white px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 ${invalid ? "border-red-500" : "border-border"}`}>
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="h-9 w-px shrink-0 bg-border" aria-hidden />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[11px] font-medium text-muted-foreground">{label}</span>
        {children}
      </span>
      {ok && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-white" aria-hidden><Check className="h-3 w-3" /></span>}
    </label>
  );
}
const bare = "block h-6 w-full bg-transparent text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
  );
}

export default function AuthForm({ mode, next, sample }: { mode: Mode; next: string; sample: Sample | null }) {
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
  // Demo Google identity. Replace with the real Google sign-in result (name + verified email) later.
  const [google, setGoogle] = useState<{ name: string; email: string } | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const verificationId = useRef<string | null>(null);

  useEffect(() => { if (ready && user && step !== "done") router.replace(next); }, [ready, user, step, next, router]);
  // Warm up Firebase on page load. If it initialises on the first click instead, Safari sees the Google popup
  // arrive late and blocks it as unrequested.
  useEffect(() => { void firebaseAuth().authStateReady(); }, []);
    useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  function validate() {
    const e: Record<string, string> = {};
    if (signup && name.trim().length < 2) e.name = "Enter your name";
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "Enter a valid 10-digit mobile number";
    if (signup && !agree) e.agree = "Please accept to continue";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  function recaptcha() {
    verifier.current?.clear();
    verifier.current = new RecaptchaVerifier(firebaseAuth(), "recaptcha-box", { size: "invisible" });
    return verifier.current;
  }

  async function sendOtp(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const auth = firebaseAuth();
      const number = `+91${phone}`;
      if (google && auth.currentUser) {
        // Google account: verify the number, then link it to the same account.
        verificationId.current = await new PhoneAuthProvider(auth).verifyPhoneNumber(number, recaptcha());
      } else {
        confirmation.current = await signInWithPhoneNumber(auth, number, recaptcha());
      }
      setStep("otp"); setOtp(""); setErr({}); setWait(30);
    } catch (e) {
      verifier.current?.clear(); verifier.current = null;
      setErr({ phone: authMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function verify(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (otp.length !== 6) { setErr({ otp: "Enter the 6-digit code" }); return; }
    setBusy(true);
    try {
      const auth = firebaseAuth();
      if (google && auth.currentUser && verificationId.current) {
        await linkWithCredential(auth.currentUser, PhoneAuthProvider.credential(verificationId.current, otp));
      } else if (confirmation.current) {
        await confirmation.current.confirm(otp);
      } else {
        throw { code: "auth/code-expired" };
      }
    } catch (e) {
      setBusy(false);
      setErr({ otp: authMessage(e) });
      return;
    }
    const sessionErr = await startSession().catch(() => "Could not start your session.");
    setBusy(false);
    if (sessionErr) { setErr({ otp: sessionErr }); return; }
    if (waitlist) { setStep("done"); return; }
    if (signup) { setStep("pay"); return; }
    login({ name: google?.name ?? "Member", phone, city, email: google?.email });
    setStep("done");
    setTimeout(() => router.push(next), 900);
  }

  // Google never skips the mobile number: after Google we still ask for it and verify it with an OTP.
  async function continueWithGoogle() {
    setBusy(true); setErr({});
    try {
      const auth = firebaseAuth();
      const { user: g } = await signInWithPopup(auth, new GoogleAuthProvider());
      const name2 = g.displayName ?? "Member";
      setGoogle({ name: name2, email: g.email ?? "" });
      setName(name2);
      // A returning user who already verified a number is let straight in.
      const known = g.phoneNumber?.replace(/^\+91/, "");
      if (known && !signup) {
        const e2 = await startSession();
        if (e2) { setErr({ google: e2 }); return; }
        login({ name: name2, phone: known, city, email: g.email ?? undefined });
        setStep("done");
        setTimeout(() => router.push(next), 900);
        return;
      }
      if (known) setPhone(known);
      setStep("details");
    } catch (e) {
      setErr({ google: authMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  // Demo checkout: no payment is taken. Swap for Razorpay (create order, open checkout, verify) later.
  function pay() {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const renews = new Date(); renews.setFullYear(renews.getFullYear() + 1);
      login({ name: name.trim() || "Member", phone, city, email: google?.email, since: new Date().toISOString(), renews: renews.toISOString() });
      setStep("done");
      setTimeout(() => router.push(next), 1100);
    }, 900);
  }

  const stepNo = step === "details" ? 1 : step === "otp" ? 2 : 3;
  const panelHead = waitlist ? "Founding spots are full." : signup ? "The dates behind every low fare." : "Your fares are waiting.";
  const panelSub = waitlist
    ? "Join the waitlist and we will message you when a spot opens."
    : `Members see the exact dates and get price-drop alerts. ₹${MEMBERSHIP_PRICE} a year, first ${SIGNUP_LIMIT.toLocaleString("en-IN")} members.`;
  const tab = (on: boolean) => `flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition ${on ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;
  const other = (path: string) => `${path}?next=${encodeURIComponent(next)}`;

  return (
    <div className="grid min-h-[calc(100vh-4rem)] bg-white lg:grid-cols-[1fr_1fr]">
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm text-center">
          <div id="recaptcha-box" />
          {step === "done" ? (
            <div role="status">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-white"><Check className="h-7 w-7" /></div>
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{waitlist ? "You are on the waitlist." : signup ? "You are in." : "Logged in."}</h1>
              <p className="mt-1 text-muted-foreground">{waitlist ? "We will message you as soon as a spot opens." : "Taking you to the fares…"}</p>
            </div>
          ) : (
            <>
              {signup && !waitlist && step !== "details" && (
                <p className="mb-2 text-sm font-medium text-muted-foreground">Step {stepNo} of 3</p>
              )}
              <h1 className="text-3xl font-extrabold tracking-tight">
                {step === "pay" ? "Complete payment" : step === "otp" ? "Enter the code" : google ? "Add your mobile number" : waitlist ? "Join the waitlist" : signup ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-2 text-[15px] text-muted-foreground">
                {step === "pay"
                  ? `₹${MEMBERSHIP_PRICE} for one year. Dates and alerts unlock straight after.`
                  : step === "otp"
                  ? `We sent a 6-digit code to +91 ${phone}.`
                  : google ? "Required. We verify it with a code and use it for fare alerts."
                  : signup ? "Use your mobile number. You pay after it is verified." : "Log in with your mobile number to see dates and alerts."}
              </p>

              {step === "details" && !google && (
                <div className="mt-6 grid grid-cols-2 rounded-xl bg-muted p-1" role="tablist" aria-label="Log in or sign up">
                  <Link href={other("/login")} role="tab" aria-selected={!signup} className={tab(!signup)}>Log in</Link>
                  <Link href={other("/signup")} role="tab" aria-selected={signup} className={tab(signup)}>Sign up</Link>
                </div>
              )}

              {step === "pay" ? (
                <div className="mt-8 space-y-6 text-left">
                  <div className="flex items-baseline justify-between border-y border-border py-4">
                    <div>
                      <p className="font-semibold">Flight Klub membership</p>
                      <p className="text-sm text-muted-foreground">1 year · founding member</p>
                    </div>
                    <p className="text-2xl font-extrabold">₹{MEMBERSHIP_PRICE}</p>
                  </div>
                  <fieldset>
                    <legend className="mb-1.5 block text-sm font-medium">Pay with</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {[["upi", "UPI"], ["card", "Card"], ["netbanking", "Net banking"]].map(([v, t]) => (
                        <label key={v} className={`flex h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition ${method === v ? "border-primary bg-secondary text-primary ring-4 ring-primary/10" : "border-border bg-white hover:border-primary/50"}`}>
                          <input type="radio" name="method" value={v} checked={method === v} onChange={() => setMethod(v)} className="sr-only" />
                          {t}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <button onClick={pay} disabled={busy} className={primaryBtn}>{busy ? "Processing…" : `Pay ₹${MEMBERSHIP_PRICE}`}</button>
                  <p className="text-center text-xs text-muted-foreground">Demo checkout: no payment is taken yet.</p>
                </div>
              ) : step === "details" ? (
                <form onSubmit={sendOtp} noValidate className={`space-y-3 text-left ${google ? "mt-8" : "mt-5"}`}>
                  {google && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border"><GoogleIcon /></span>
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold">{google.name}</span><span className="block truncate text-xs text-muted-foreground">{google.email}</span></span>
                      </div>
                      <button type="button" onClick={() => { void firebaseAuth().signOut(); setGoogle(null); setName(""); }} className="shrink-0 text-sm font-medium text-primary hover:underline">Change</button>
                    </div>
                  )}
                  {signup && !google && (
                    <div>
                      <Field icon={<IconUser />} label="Full name" invalid={!!err.name} ok={name.trim().length >= 2}>
                        <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="As on your ID" className={bare} aria-invalid={!!err.name} />
                      </Field>
                      {err.name && <p className="mt-1 text-sm text-red-600" role="alert">{err.name}</p>}
                    </div>
                  )}
                  <div>
                    <Field icon={<IconPhone />} label="Mobile number" invalid={!!err.phone} ok={/^[6-9]\d{9}$/.test(phone)}>
                      <span className="flex items-center gap-1.5">
                        <span className="select-none text-[15px] font-semibold text-muted-foreground">+91</span>
                        <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit number" className={bare} aria-invalid={!!err.phone} />
                      </span>
                    </Field>
                    {err.phone
                      ? <p className="mt-1 text-sm text-red-600" role="alert">{err.phone}</p>
                      : <p className="mt-1 text-xs text-muted-foreground">Required. We will text you a code to confirm it.</p>}
                  </div>
                  {signup && (
                    <Field icon={<IconPin />} label="Flying from">
                      <select id="city" value={city} onChange={(e) => setCity(e.target.value)} className={`${bare} cursor-pointer`}>
                        {ORIGINS.map((o) => <option key={o.slug}>{o.name}</option>)}
                      </select>
                    </Field>
                  )}
                  {signup && (
                    <div className="pt-1">
                      <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8b1d24]" />
                        <span>Send me fare alerts on WhatsApp and SMS. I agree to the terms and privacy policy.</span>
                      </label>
                      {err.agree && <p className="mt-1 text-sm text-red-600" role="alert">{err.agree}</p>}
                    </div>
                  )}
                  <button disabled={busy} className={`${primaryBtn} mt-2`}>
                    {busy ? "Sending code…" : waitlist ? "Join waitlist" : "Continue"}
                  </button>

                  {!google && (
                    <>
                      <div className="flex items-center gap-4 pt-3 text-sm text-muted-foreground"><span className="h-px flex-1 bg-border" />Or continue with<span className="h-px flex-1 bg-border" /></div>
                      <div className="flex justify-center pt-1">
                        <button type="button" onClick={continueWithGoogle} disabled={busy} aria-label="Continue with Google" title="Continue with Google"
                          className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-white transition hover:border-primary/50 hover:shadow-md disabled:opacity-60">
                          <GoogleIcon />
                        </button>
                      </div>
                      {err.google && <p className="text-center text-sm text-red-600" role="alert">{err.google}</p>}
                    </>
                  )}
                  <p className="pt-4 text-center text-xs leading-relaxed text-muted-foreground">
                    Flight Klub finds the cheapest months and destinations from your city. A verified mobile number keeps your alerts and account safe.
                  </p>
                </form>
              ) : (
                <form onSubmit={verify} className="mt-8 space-y-5">
                  <div>
                    <OtpInput value={otp} onChange={(v) => { setOtp(v); setErr({}); }} invalid={!!err.otp} />
                    {err.otp && <p className="mt-2 text-left text-sm text-red-600" role="alert">{err.otp}</p>}
                  </div>
                  <button disabled={busy} className={primaryBtn}>
                    {busy ? "Checking…" : waitlist ? "Verify and join" : signup ? "Verify and continue" : "Verify and log in"}
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button type="button" onClick={() => { setStep("details"); setOtp(""); setErr({}); }} className="font-medium text-muted-foreground hover:text-primary">Change number</button>
                    {wait > 0
                      ? <span className="text-muted-foreground">Resend in {wait}s</span>
                      : <button type="button" onClick={() => sendOtp()} className="font-medium text-primary hover:underline">Resend code</button>}
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </section>

      <aside className="hidden p-4 lg:block">
        <div className="flex h-full min-h-[34rem] flex-col items-center justify-center rounded-3xl bg-[#f6e3df] p-10 xl:p-14">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#2a0f12] xl:text-4xl">{panelHead}</h2>
            <p className="mt-3 text-[15px] text-[#2a0f12]/65">{panelSub}</p>
            {sample && (
              <div className="relative mt-10">
                <div className="absolute inset-x-6 -bottom-3 h-full rounded-2xl bg-white/50" aria-hidden />
                <div className="absolute inset-x-3 -bottom-1.5 h-full rounded-2xl bg-white/70" aria-hidden />
                <div className="relative"><Ticket s={sample} /></div>
              </div>
            )}
            <p className="mt-12 text-sm text-[#2a0f12]/60">Need help? <a href={`mailto:${EMAIL}`} className="underline underline-offset-2 hover:text-[#2a0f12]">{EMAIL}</a></p>
          </div>
        </div>
      </aside>
    </div>
  );
}
