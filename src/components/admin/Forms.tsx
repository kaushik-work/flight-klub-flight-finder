"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePassword, login, logout, recover, type FormState } from "@/app/admin/actions";

const field = "h-12 w-full rounded-xl border border-border bg-white px-4 text-[15px] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const button = "font-label flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60";
const none: FormState = {};

function Err({ s }: { s: FormState }) {
  return s.error ? <p className="text-sm text-red-600" role="alert">{s.error}</p> : null;
}

export function LoginForm() {
  const [s, act, pending] = useActionState(login, none);
  return (
    <form action={act} className="space-y-4">
      <label className="block text-sm font-medium">Username<input name="username" autoComplete="username" required className={`${field} mt-1.5`} /></label>
      <label className="block text-sm font-medium">Password<input name="password" type="password" autoComplete="current-password" required className={`${field} mt-1.5`} /></label>
      <Err s={s} />
      <button className={button} disabled={pending}>{pending ? "Checking…" : "Log in"}</button>
      <p className="text-center text-sm"><Link href="/admin/forgot" className="text-primary hover:underline">Forgot password?</Link></p>
    </form>
  );
}

export function RecoverForm() {
  const [s, act, pending] = useActionState(recover, none);
  if (s.done) {
    return (
      <div className="text-center">
        <p className="t-title text-xl">Password changed.</p>
        <Link href="/admin/login" className={`${button} mt-5`}>Back to log in</Link>
      </div>
    );
  }
  return (
    <form action={act} className="space-y-4">
      <label className="block text-sm font-medium">Recovery key<input name="key" type="password" autoComplete="off" required className={`${field} mt-1.5`} /></label>
      <p className="-mt-2 text-xs text-muted-foreground">The ADMIN_RECOVERY_KEY value from the server settings.</p>
      <label className="block text-sm font-medium">New password<input name="password" type="password" autoComplete="new-password" required minLength={10} className={`${field} mt-1.5`} /></label>
      <label className="block text-sm font-medium">New password again<input name="again" type="password" autoComplete="new-password" required minLength={10} className={`${field} mt-1.5`} /></label>
      <Err s={s} />
      <button className={button} disabled={pending}>{pending ? "Saving…" : "Set new password"}</button>
      <p className="text-center text-sm"><Link href="/admin/login" className="text-primary hover:underline">Back to log in</Link></p>
    </form>
  );
}

export function ChangePasswordForm() {
  const [s, act, pending] = useActionState(changePassword, none);
  return (
    <form action={act} className="grid gap-3 sm:max-w-sm">
      <input name="current" type="password" placeholder="Current password" autoComplete="current-password" required className={field} />
      <input name="password" type="password" placeholder="New password (10+ characters)" autoComplete="new-password" required minLength={10} className={field} />
      <input name="again" type="password" placeholder="New password again" autoComplete="new-password" required minLength={10} className={field} />
      <Err s={s} />
      {s.done && <p className="text-sm text-price" role="status">Password changed.</p>}
      <button className={button} disabled={pending}>{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <button className="font-label rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted">Log out</button>
    </form>
  );
}
