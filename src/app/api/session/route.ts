import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import { adminAuth, SESSION_COOKIE, SESSION_DAYS } from "@/lib/firebase/admin";

// Server session. The browser trades a fresh Firebase ID token for an httpOnly cookie, so the login can be
// checked on the server and cannot be read or stolen by page scripts.
//   POST   { idToken }  verify, require a verified mobile number, set the cookie
//   GET                 who is logged in
//   DELETE              log out

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const auth = adminAuth();
  if (!auth) return json({ error: "Server auth is not configured" }, 503);

  let idToken: unknown;
  try { ({ idToken } = await request.json()); } catch { return json({ error: "Invalid body" }, 400); }
  if (typeof idToken !== "string" || idToken.length < 20) return json({ error: "Invalid token" }, 400);

  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    // The mobile number is compulsory: refuse any login whose number has not been verified by an SMS code.
    if (!decoded.phone_number) return json({ error: "A verified mobile number is required" }, 403);
    // Only issue a cookie for a sign-in from the last 5 minutes.
    if (Date.now() / 1000 - decoded.auth_time > 300) return json({ error: "Please sign in again" }, 401);

    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const cookie = await auth.createSessionCookie(idToken, { expiresIn });
    (await cookies()).set(SESSION_COOKIE, cookie, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: expiresIn / 1000,
    });
    return json({ ok: true, user: { name: decoded.name ?? null, email: decoded.email ?? null, phone: decoded.phone_number } });
  } catch {
    return json({ error: "Could not verify sign-in" }, 401);
  }
}

export async function GET() {
  const auth = adminAuth();
  if (!auth) return json({ error: "Server auth is not configured" }, 503);
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return json({ user: null }, 401);
  try {
    const d = await auth.verifySessionCookie(value, true);
    return json({ user: { name: d.name ?? null, email: d.email ?? null, phone: d.phone_number ?? null } });
  } catch {
    return json({ user: null }, 401);
  }
}

export async function DELETE() {
  const auth = adminAuth();
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  if (auth && value) {
    try { await auth.revokeRefreshTokens((await auth.verifySessionCookie(value)).sub); } catch {}
  }
  jar.delete(SESSION_COOKIE);
  return json({ ok: true });
}
