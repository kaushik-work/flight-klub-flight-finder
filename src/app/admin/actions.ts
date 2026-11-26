"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { importFirebaseUsers } from "@/lib/admin/import";
import { adminUsername, blocked, checkLogin, endSession, recoveryKeyMatches, requireAdmin, setPassword, startSession, strike } from "@/lib/admin/auth";

export type FormState = { error?: string; done?: boolean };

const ipOf = async () => ((await headers()).get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
const text = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : "");

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const ip = await ipOf();
  if (blocked(ip)) return { error: "Too many attempts. Try again in 15 minutes." };
  const user = text(form, "username").trim().slice(0, 60);
  const pass = text(form, "password").slice(0, 200);
  if (!user || !pass || !(await checkLogin(user, pass))) {
    strike(ip);
    return { error: "Wrong username or password." };
  }
  await startSession(user);
  redirect("/admin");
}

export async function logout() {
  await requireAdmin();
  await endSession();
  redirect("/admin/login");
}

/** Forgot password: the owner's recovery key (kept in the server settings) proves who is asking, then a new password is set. */
export async function recover(_: FormState, form: FormData): Promise<FormState> {
  const ip = await ipOf();
  if (blocked(ip)) return { error: "Too many attempts. Try again in 15 minutes." };
  const key = text(form, "key");
  const next = text(form, "password");
  const again = text(form, "again");
  if (next.length < 10) return { error: "Use at least 10 characters for the new password." };
  if (next !== again) return { error: "The two passwords do not match." };
  if (!recoveryKeyMatches(key)) { strike(ip); return { error: "That recovery key is not right." }; }
  await setPassword(adminUsername(), next);
  return { done: true };
}

/** Change the password while logged in. */
export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const current = text(form, "current");
  const next = text(form, "password");
  if (next.length < 10) return { error: "Use at least 10 characters for the new password." };
  if (next !== text(form, "again")) return { error: "The two passwords do not match." };
  if (!(await checkLogin(user, current))) return { error: "Your current password is not right." };
  await setPassword(user, next);
  return { done: true };
}

/** Pull the latest signups from Firebase's list of verified numbers into the CRM, then come back to the Signups screen. */
export async function syncSignups() {
  await requireAdmin();
  const r = await importFirebaseUsers();
  redirect(r.ok ? `/admin/signups?synced=${r.added}&seen=${r.seen}` : `/admin/signups?syncerror=${encodeURIComponent(r.error)}`);
}
