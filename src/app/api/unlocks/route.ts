import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import { adminAuth, SESSION_COOKIE } from "@/lib/firebase/admin";
import { getFaresDb } from "@/lib/flight-fares/store";
import { getTrial, unlockCard, validKey } from "@/lib/unlocks";
import { recordPayment } from "@/lib/crm";

// The date-unlock trial, kept in the database against the verified mobile number from the server session.
//   GET            what this account has bought and which cards are open
//   POST { key }   record one paid unlock (key = origin:destination:nights)
// 503 means server login is not configured, in which case the site keeps the trial in the browser (demo mode).

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function phoneFromSession(): Promise<{ phone?: string; status?: number }> {
  const auth = adminAuth();
  if (!auth) return { status: 503 };
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return { status: 401 };
  try {
    const d = await auth.verifySessionCookie(value, true);
    return d.phone_number ? { phone: d.phone_number } : { status: 403 };
  } catch { return { status: 401 }; }
}

export async function GET() {
  const { phone, status } = await phoneFromSession();
  if (!phone) return json({ error: "No session" }, status);
  try { return json({ trial: await getTrial(await getFaresDb(), phone) }); } catch { return json({ error: "Unavailable" }, 500); }
}

export async function POST(request: NextRequest) {
  const { phone, status } = await phoneFromSession();
  if (!phone) return json({ error: "No session" }, status);
  let key: unknown;
  try { ({ key } = await request.json()); } catch { return json({ error: "Invalid body" }, 400); }
  if (!validKey(key)) return json({ error: "Invalid card" }, 400);
  try {
    // Demo checkout: the payment is not verified yet. When Razorpay is live, verify the payment signature here
    // and refuse the unlock if it does not check out.
    const r = await unlockCard(await getFaresDb(), phone, key, "demo");
    // A new unlock is a payment the CRM reports on. Recording it never blocks or undoes the unlock itself.
    if (r.ok && !r.already) await recordPayment(phone, { kind: "unlock", cardKey: key }).catch(() => {});
    return r.ok ? json({ ok: true, trial: r.trial, already: r.already }) : json({ error: r.reason, trial: r.trial }, r.reason === "used-up" ? 409 : 400);
  } catch { return json({ error: "Unavailable" }, 500); }
}
