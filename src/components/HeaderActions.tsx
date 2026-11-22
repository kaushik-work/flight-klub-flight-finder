"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useHydrated, useNow } from "@/lib/useHydrated";


const on = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export default function HeaderActions() {
  const path = usePathname() ?? "";
  const auth = useAuth();
  const hydrated = useHydrated();
  const ready = hydrated && auth.ready;
  const user = hydrated ? auth.user : null;
  const alerts = hydrated ? auth.alerts : [];
  const { logout } = auth;
  const now = useNow();
  // Over 30 days left: show the expiry date. 30 or fewer: show the days left.
  const left = user?.renews && now ? Math.ceil((new Date(user.renews).getTime() - now) / 86_400_000) : null;
  const memberLine = !user?.renews ? null
    : left !== null && left <= 0 ? "Membership expired"
    : left !== null && left <= 30 ? `Member · ${left} day${left === 1 ? "" : "s"} left`
    : `Member · expires ${new Date(user.renews).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  const [open, setOpen] = useState(false);

  return (
    <nav className="font-label flex items-center gap-1 text-sm font-medium text-muted-foreground sm:gap-5">
      {[["/flight-finder", "Flight deals"], ["/blog", "Blog"]].map(([href, text]) => (
        <Link key={href} href={href} aria-current={on(path, href) ? "page" : undefined}
          className={`relative hidden py-2 transition sm:inline ${on(path, href) ? "font-semibold text-primary after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary" : "hover:text-primary"}`}>
          {text}
        </Link>
      ))}

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
                  <p className="text-xs text-muted-foreground">{user.phone ? `+91 ${user.phone.slice(0, 2)}••••${user.phone.slice(-4)}` : "Signed in with Google"} · {user.city}</p>
                  {memberLine && <p className="font-label mt-1 text-xs font-semibold text-primary">{memberLine}</p>}
                </div>
                <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className="mt-1 block rounded-lg px-3 py-2 font-semibold hover:bg-muted">My account</Link>
                <Link role="menuitem" href="/alerts" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted">
                  Price alerts <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">{alerts.length}</span>
                </Link>
                <button role="menuitem" onClick={() => { logout(); setOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-muted">Log out</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <Link href="/login" aria-current={on(path, "/login") ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition sm:px-4 sm:py-2 ${on(path, "/login") ? "bg-secondary font-semibold text-primary ring-1 ring-primary/30" : "text-foreground hover:text-primary"}`}>Log in</Link>
          <Link href="/signup" aria-current={on(path, "/signup") ? "page" : undefined}
            className={`whitespace-nowrap rounded-full bg-primary px-3.5 py-1.5 text-sm text-primary-foreground transition hover:opacity-90 sm:px-4 sm:py-2 ${on(path, "/signup") ? "ring-4 ring-primary/25" : ""}`}>Sign up</Link>
        </>
      )}
    </nav>
  );
}
