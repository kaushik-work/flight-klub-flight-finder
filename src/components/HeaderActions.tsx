"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { WHATSAPP_URL } from "@/lib/site";

export default function HeaderActions() {
  const { ready, user, alerts, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="font-label flex items-center gap-3 text-sm font-medium text-muted-foreground sm:gap-5">
      <Link href="/flight-finder" className="hidden hover:text-primary sm:inline">Flights</Link>
      <Link href="/flight-finder#months" className="hidden hover:text-primary sm:inline">Months</Link>
      <Link href="/blog" className="hidden hover:text-primary sm:inline">Blog</Link>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hidden hover:text-primary md:inline">WhatsApp</a>

      {!ready ? (
        <span className="h-10 w-28" aria-hidden />
      ) : user ? (
        <div className="relative">
          <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
            className="flex h-10 items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-foreground transition hover:border-primary/50">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{user.name.charAt(0).toUpperCase()}</span>
            <span className="hidden max-w-24 truncate sm:inline">{user.name.split(" ")[0]}</span>
          </button>
          {open && (
            <>
              <button aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
              <div role="menu" className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-border bg-card p-2 text-foreground shadow-xl">
                <div className="border-b border-border px-3 pb-3 pt-2">
                  <p className="font-bold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.phone ? `+91 ${user.phone}` : "Signed in with Google"} · {user.city}</p>
                  {user.renews && <p className="font-label mt-1 text-xs font-semibold text-primary">Member · valid till {new Date(user.renews).toLocaleString("en-IN", { month: "short", year: "numeric" })}</p>}
                </div>
                <Link role="menuitem" href="/flight-finder" onClick={() => setOpen(false)} className="mt-1 flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted">
                  Price alerts <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">{alerts.length}</span>
                </Link>
                <button role="menuitem" onClick={() => { logout(); setOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-muted">Log out</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <Link href="/login" className="rounded-full px-3 py-2 text-foreground hover:text-primary">Log in</Link>
          <Link href="/signup" className="rounded-full bg-primary px-4 py-2 text-primary-foreground transition hover:opacity-90">Join · ₹399/yr</Link>
        </>
      )}
    </nav>
  );
}
