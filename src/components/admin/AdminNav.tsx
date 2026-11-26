"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Home" },
  { href: "/admin/signups", label: "Signups" },
  { href: "/admin/fares", label: "Fares" },
];

/** The three admin tabs, with the current one filled in so it is always clear where you are. */
export default function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="font-label flex gap-1 rounded-xl bg-muted p-1 text-sm font-semibold">
      {NAV.map((n) => {
        const on = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-lg px-4 py-1.5 transition ${on ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
