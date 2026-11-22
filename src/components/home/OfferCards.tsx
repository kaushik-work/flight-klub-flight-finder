"use client";

import Link from "next/link";
import { type CSSProperties } from "react";
import CountUp from "@/components/home/CountUp";
import Squiggle from "@/components/home/Squiggle";
import { ArrowRight } from "@/components/Icons";
import { addMonths, PLANS } from "@/lib/site";
import { useNow } from "@/lib/useHydrated";

/** The two membership offers and how long each is valid. The exact end date appears once the browser knows today's date. */
export default function OfferCards() {
  const now = useNow();
  const till = (months: number) =>
    now ? addMonths(new Date(now), months).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;
  const four = PLANS[0].price * (12 / PLANS[0].months);
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-label="Membership offers">
      {PLANS.map((p, i) => {
        const best = p.months === 12;
        const save = Math.round((1 - p.price / four) * 100);
        return (
          <div key={p.id} className="ticket-shell reveal" style={{ "--i": i } as CSSProperties}>
            <div className="float h-full" style={{ animationDelay: `${i * 0.9}s` }}>
            <div className={`ticket shine flex h-full flex-col text-foreground ${best ? "ring-2 ring-[#e06b5a]/60" : ""}`} style={{ "--y": "calc(100% - 5.5rem)" } as CSSProperties}>
              <div className="flex-1 p-6">
                <div className="flex h-7 items-center justify-between gap-2">
                  <p className="t-label whitespace-nowrap !text-[11px] text-primary">{p.name}</p>
                  {best && <span className="whitespace-nowrap rounded-full bg-price px-2.5 py-1 text-[11px] font-bold text-white">Save {save}%</span>}
                </div>
                <p className="t-title mt-3 text-5xl text-foreground"><span className="relative inline-block">₹<CountUp to={p.price} /><Squiggle color="#e06b5a" /></span></p>
                <p className="mt-1 text-sm text-muted-foreground">₹{Math.round(p.price / p.months)} a month</p>
                <div className="mt-5 rounded-xl bg-secondary px-3.5 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Validity</p>
                  <p className="t-num text-[15px] font-bold text-foreground">{till(p.months) ? `Valid till ${till(p.months)}` : `Valid for ${p.name}`}</p>
                </div>
              </div>
              <div className="ticket-perf flex h-[5.5rem] items-center px-6">
                <Link href={`/signup?plan=${p.id}`} className={`font-label group flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-bold transition hover:-translate-y-0.5 hover:opacity-95 ${best ? "pulse-ring bg-primary text-primary-foreground" : "bg-foreground text-white"}`}>
                  Get {p.name}<ArrowRight className="ml-1.5 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
