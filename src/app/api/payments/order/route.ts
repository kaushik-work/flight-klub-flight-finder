import { type NextRequest } from "next/server";
import { quote, saveOrder, type Want } from "@/lib/payments";
import { createOrder, razorpayConfigured, razorpayMode } from "@/lib/razorpay";
import { sessionPhone } from "@/lib/session";

// Step 1 of a payment: the server decides what is being bought and for how much, creates the Razorpay order and remembers it.
//   POST { kind: "plan", planId } | { kind: "unlock", key }  + { name, city, email? }
// 503 "not-configured" means no Razorpay keys are set, and the site uses its demo checkout instead.

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: NextRequest) {
  if (!razorpayConfigured()) return json({ error: "not-configured" }, 503);
  const s = await sessionPhone();
  if (!s.phone) return json({ error: s.status === 503 ? "not-configured" : "Please log in again." }, s.status);

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return json({ error: "Invalid body" }, 400); }
  const name = str(b.name, 80), city = str(b.city, 60), email = str(b.email, 120);
  if (!name || !city) return json({ error: "Missing your name or city." }, 400);

  const want: Want = b.kind === "plan" ? { kind: "plan", planId: str(b.planId, 10) } : { kind: "unlock", cardKey: str(b.key, 100) };
  try {
    const q = await quote(s.phone, want);
    if (!q.ok) return json({ error: q.error }, 409);
    const order = await createOrder(q.amount, `fk-${Date.now().toString(36)}`, { phone: s.phone, kind: want.kind });
    await saveOrder({
      _id: order.id, phone: s.phone, amount: q.amount, createdAt: new Date().toISOString(), status: "created",
      member: { name, city, ...(email ? { email } : {}) }, ...want,
    });
    return json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, mode: razorpayMode(), phone: s.phone });
  } catch {
    return json({ error: "Could not start the payment. Nothing was charged. Please try again." }, 502);
  }
}
