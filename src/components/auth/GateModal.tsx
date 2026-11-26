"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowRight, Bell, Lock } from "@/components/Icons";
import { TRIAL_DAYS, TRIAL_PRICE } from "@/components/auth/AuthProvider";
import { type GateCard, type GateOffer, signupUrl } from "@/lib/gate";
import { inrMasked } from "@/lib/fares";
import { PLANS } from "@/lib/site";

/**
 * The popup a visitor gets when they tap Unlock on a fare. They pick what to buy, then the next screen asks for their mobile
 * number and the code we text them, and they pay. Either way the fare they tapped ends up open with a price alert on it.
 */
export default function GateModal({ card, onClose }: { card: GateCard; onClose: () => void }) {
  const router = useRouter();
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [onClose]);

  const go = (offer: GateOffer) => router.push(signupUrl(card, offer));
  const options: { offer: GateOffer; title: string; price: number; note: string; best?: boolean }[] = [
    { offer: "unlock", title: "Just this fare", price: TRIAL_PRICE, note: `Exact dates for ${card.city}, open for ${TRIAL_DAYS} days` },
    { offer: "3m", title: PLANS[0].name, price: PLANS[0].price, note: "Dates and alerts on every fare" },
    { offer: "12m", title: PLANS[1].name, price: PLANS[1].price, note: "Dates and alerts on every fare", best: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-labelledby="gate-title" className="page-enter relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="t-label flex items-center gap-1.5 !text-[11px] text-primary"><Lock />Unlock</p>
            <h2 id="gate-title" className="t-title mt-1.5 text-2xl">{card.originName} to {card.city}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{card.nights} nights · from {inrMasked(card.price)}</p>
          </div>
          <button ref={close} onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-lg text-muted-foreground transition hover:bg-muted">×</button>
        </div>

        <p className="mt-5 text-sm font-semibold">Choose how to unlock</p>
        <ul className="mt-2 space-y-2.5">
          {options.map((o) => (
            <li key={o.offer}>
              <button onClick={() => go(o.offer)} className={`group relative flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition hover:border-primary hover:bg-secondary ${o.best ? "border-primary/40 bg-secondary/50" : "border-border"}`}>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[15px] font-semibold">{o.title}{o.best && <span className="rounded-full bg-price px-2 py-0.5 text-[10px] font-bold text-white">Best value</span>}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{o.note}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="t-title t-num text-xl">₹{o.price}</span>
                  <ArrowRight className="text-primary transition group-hover:translate-x-1" />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted px-3.5 py-3 text-xs text-muted-foreground">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>We then ask for your mobile number and a code we text you. Whatever you choose, this fare opens on its own and we set a price alert on it for you. GST included.</span>
        </p>
      </div>
    </div>
  );
}
