import "server-only";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getFaresDb } from "@/lib/flight-fares/store";

// Admin (CRM) login. One account, checked on the server:
//  - the username and password hash come from ADMIN_USER / ADMIN_PASSWORD_HASH until the password is changed, after
//    which the new hash lives in the "admin_users" collection and wins;
//  - a login sets an httpOnly cookie holding "user.expiry.signature" (HMAC with ADMIN_SESSION_SECRET);
//  - forgetting the password is solved with ADMIN_RECOVERY_KEY, a long secret only the owner holds. Email links can
//    replace it once an email service is connected.
// Every admin page and action calls requireAdmin() itself: layouts are not re-run on navigation, so the check cannot live there.

export const ADMIN_COOKIE = "fk_admin";
const SESSION_HOURS = 12;

export const hashPassword = (password: string, salt = randomBytes(16).toString("hex")) =>
  `scrypt.${salt}.${scryptSync(password, salt, 64).toString("hex")}`;

export function verifyPassword(password: string, stored: string): boolean {
  // Dots, not "$": a "$" in .env is read as a variable reference and would corrupt the value.
  const [alg, salt, hash] = stored.split(".");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const a = scryptSync(password, salt, 64);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const secret = () => {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("ADMIN_SESSION_SECRET must be set (32+ characters)");
  return s;
};
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");
const same = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

type AdminDoc = { _id: string; hash: string; updatedAt: string };

/** The stored hash for a username: the database copy (after a reset) or the one in the environment. */
async function storedHash(username: string): Promise<string | null> {
  try {
    const doc = await (await getFaresDb()).collection<AdminDoc>("admin_users").findOne({ _id: username });
    if (doc) return doc.hash;
  } catch {}
  return username === process.env.ADMIN_USER ? process.env.ADMIN_PASSWORD_HASH ?? null : null;
}

// 5 wrong attempts per IP per 15 minutes. In memory, so it is per server instance.
const strikes = new Map<string, { n: number; reset: number }>();
export const blocked = (ip: string) => {
  const s = strikes.get(ip);
  return !!s && s.reset > Date.now() && s.n >= 5;
};
export function strike(ip: string) {
  const s = strikes.get(ip);
  if (!s || s.reset <= Date.now()) strikes.set(ip, { n: 1, reset: Date.now() + 15 * 60_000 });
  else s.n += 1;
}

export async function checkLogin(username: string, password: string): Promise<boolean> {
  const stored = await storedHash(username);
  // Run a hash even for an unknown user so the response time does not reveal which usernames exist.
  const ok = verifyPassword(password, stored ?? hashPassword("x", "00".repeat(16)));
  return !!stored && ok;
}

export async function startSession(username: string) {
  const exp = Date.now() + SESSION_HOURS * 3_600_000;
  const payload = `${username}.${exp}`;
  (await cookies()).set(ADMIN_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/admin", maxAge: SESSION_HOURS * 3600,
  });
}
export async function endSession() {
  (await cookies()).set(ADMIN_COOKIE, "", { httpOnly: true, path: "/admin", maxAge: 0 });
}

/** The logged-in admin's username, or null. */
export async function getAdmin(): Promise<string | null> {
  await connection(); // the expiry check reads the clock, so this is request-time work, never part of a prerender
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!v) return null;
  const i = v.lastIndexOf(".");
  const payload = v.slice(0, i);
  const sig = v.slice(i + 1);
  if (!payload || !same(sig, sign(payload))) return null;
  const j = payload.lastIndexOf(".");
  return Number(payload.slice(j + 1)) > Date.now() ? payload.slice(0, j) : null;
}
export async function requireAdmin(): Promise<string> {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

export function recoveryKeyMatches(given: string): boolean {
  const k = process.env.ADMIN_RECOVERY_KEY;
  return !!k && k.length >= 24 && same(given.trim(), k);
}
export async function setPassword(username: string, password: string) {
  await (await getFaresDb()).collection<AdminDoc>("admin_users").updateOne(
    { _id: username }, { $set: { hash: hashPassword(password), updatedAt: new Date().toISOString() } }, { upsert: true });
}
export const adminUsername = () => process.env.ADMIN_USER ?? "";
