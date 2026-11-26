"use client";

import { useEffect, useRef, useState } from "react";
import { CheckBadge, Lock } from "@/components/Icons";
import { TRIAL_DAYS, TRIAL_PRICE, TRIAL_UNLOCKS, trialLeft, useAuth } from "@/components/auth/AuthProvider";
import { PLANS, planById } from "@/lib/site";

export type UnlockTarget = { key: string; label: string };

/**
 * Demo checkout, no payment is taken. With trial unlocks left it sells one card's dates for TRIAL_PRICE (GST included);
 * once the three are used it offers the two plans. Swap `pay()` for Razorpay (create order, open checkout, verify) later.
 */
export default function UnlockDialog({ target, onClose }: { target: UnlockTarget | null; onClose: () => void }) {
  const auth = useAuth();
  const left = trialLeft(auth.user);
  const cardMode = !!target && left > 0;
  const [planId, setPlanId] = useState<string>(PLANS[1].id);
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [onClose]);

  function pay() {
    if (busy) return;
    setBusy(true);
    // Demo only. The unlock is recorded after the (pretend) payment succeeds, never before.
    setTimeout(() => {
      if (cardMode && target) {
        if (auth.unlockCard(target.key)) setDone(`Dates unlocked for ${TRIAL_DAYS} days.`);
        else setDone("This card is already unlocked.");
      } else {
        const p = planById(planId);
        auth.buyPlan(p.months, p.id);
        setDone(`${p.name} membership is on. Every date is unlocked.`);
      }
      setBusy(false);
    }, 900);
  }

  const plan = planById(planId);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-labelledby="unlock-title" className="page-enter relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="t-label flex items-center gap-1.5 !text-[11px] text-primary"><Lock />{cardMode ? "Unlock dates" : "Membership"}</p>
            <h2 id="unlock-title" className="t-title mt-1.5 text-2xl">{cardMode ? target!.label : "Get every date"}</h2>
          </div>
          <button ref={close} onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-lg text-muted-foreground transition hover:bg-muted">×</button>
        </div>

        {done ? (
          <div className="mt-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary"><CheckBadge tone="primary" size="sm" /></span>
            <p className="t-title mt-3 text-xl">{done}</p>
            <button onClick={onClose} className="font-label mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-primary-foreground transition hover:opacity-90">Show the dates</button>
          </div>
        ) : (
          <>
            {cardMode ? (
              <div className="mt-5 rounded-2xl bg-muted px-4 py-3 text-sm">
                <p className="flex items-baseline justify-between"><span className="text-muted-foreground">One card, all its dates</span><span className="t-title t-num text-2xl">₹{TRIAL_PRICE}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Including GST. Open for {TRIAL_DAYS} days. Trial unlock {TRIAL_UNLOCKS - left + 1} of {TRIAL_UNLOCKS}; each account gets {TRIAL_UNLOCKS} in total, paid one at a time.</p>
              </div>
            ) : (
              <fieldset className="mt-5">
                <legend className="mb-1.5 block text-sm font-medium">{auth.user?.trial ? `Your ${TRIAL_UNLOCKS} trial unlocks are used. Choose a plan:` : "Choose your plan"}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {PLANS.map((p) => (
                    <label key={p.id} className={`relative flex cursor-pointer flex-col rounded-xl border px-4 py-3 transition ${planId === p.id ? "border-primary bg-secondary ring-4 ring-primary/10" : "border-border bg-white hover:border-primary/50"}`}>
                      <input type="radio" name="plan" value={p.id} checked={planId === p.id} onChange={() => setPlanId(p.id)} className="sr-only" />
                      <span className="t-title t-num text-xl">₹{p.price}</span>
                      <span className="text-xs text-muted-foreground">Valid for {p.name}</span>
                      {p.months === 12 && <span className="absolute right-3 top-3 rounded-full bg-price px-2 py-0.5 text-[10px] font-bold text-white">Best value</span>}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Every date, and price alerts on any route. GST included.</p>
              </fieldset>
            )}

            <fieldset className="mt-4">
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
            <button onClick={pay} disabled={busy} className="font-label mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
              {busy ? "Processing…" : `Pay ₹${cardMode ? TRIAL_PRICE : plan.price}`}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Demo checkout: no payment is taken yet.</p>
          </>
        )}
      </div>
    </div>
  );
}
