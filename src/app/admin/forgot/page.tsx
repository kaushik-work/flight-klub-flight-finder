import type { Metadata } from "next";
import { RecoverForm } from "@/components/admin/Forms";

export const metadata: Metadata = { title: "Reset admin password", robots: { index: false, follow: false } };

export default function AdminForgot() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-white p-7 shadow-sm">
        <p className="t-label !text-[11px] text-primary">Flight Klub</p>
        <h1 className="t-title mt-1.5 text-2xl">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the recovery key from the server settings, then choose a new password.</p>
        <div className="mt-6"><RecoverForm /></div>
      </div>
    </main>
  );
}
