import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "@/components/admin/Forms";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Home" },
  { href: "/admin/signups", label: "Signups" },
  { href: "/admin/fares", label: "Fares" },
];

async function Who() {
  const user = await requireAdmin();
  return <span className="hidden text-sm text-muted-foreground sm:inline">{user}</span>;
}

// Shell only. Each page checks the login itself (a layout is not re-run on navigation), and anything that reads the
// request streams in behind the Suspense boundary.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-muted/50">
      <header className="sticky top-0 z-20 border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="t-title text-lg">Flight Klub <span className="text-primary">Admin</span></Link>
            <nav className="font-label flex gap-1 text-sm font-semibold">
              {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">{n.label}</Link>)}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}><Who /></Suspense>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
