import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import { adminAuth, SESSION_COOKIE } from "@/lib/firebase/admin";
import { recordMember, recordPayment } from "@/lib/crm";
import { PLANS } from "@/lib/site";

// Tells the CRM about a signup or a plan purchase, against the verified mobile number from the server session.
//   POST { event: "signup" | "trial" | "plan", name, city, email?, planId?, method? }
// 503 means server login is not configured (local demo): the site carries on and nothing is recorded.

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: NextRequest) {
  const auth = adminAuth();
  if (!auth) return json({ error: "Server auth is not configured" }, 503);
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return json({ error: "No session" }, 401);
  let phone: string | undefined;
  try { phone = (await auth.verifySessionCookie(value, true)).phone_number; } catch { return json({ error: "No session" }, 401); }
  if (!phone) return json({ error: "No verified number" }, 403);

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return json({ error: "Invalid body" }, 400); }
  const event = b.event;
  const name = str(b.name, 80), city = str(b.city, 60), email = str(b.email, 120);
  if (!name || !city || (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return json({ error: "Invalid details" }, 400);

  try {
    if (event === "plan") {
      const planId = str(b.planId, 10);
      if (!PLANS.some((p) => p.id === planId)) return json({ error: "Unknown plan" }, 400);
      await recordMember(phone, { name, city, email }, { plan: planId });
      await recordPayment(phone, { kind: "plan", planId, method: str(b.method, 20) || undefined });
    } else if (event === "signup" || event === "trial") {
      await recordMember(phone, { name, city, email }, event === "trial" ? { trial: true } : {});
    } else return json({ error: "Unknown event" }, 400);
    return json({ ok: true });
  } catch { return json({ error: "Unavailable" }, 500); }
}
