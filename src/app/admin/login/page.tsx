import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/Forms";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default function AdminLogin() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-white p-7 shadow-sm">
        <p className="t-label !text-[11px] text-primary">Flight Klub</p>
        <h1 className="t-title mt-1.5 text-2xl">Admin log in</h1>
        <div className="mt-6"><LoginForm /></div>
      </div>
    </main>
  );
}
