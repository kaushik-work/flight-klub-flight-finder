import { type NextRequest } from "next/server";
import { fulfilOrder, getOrder } from "@/lib/payments";
import { checkoutSignatureValid, razorpayConfigured, razorpayMode } from "@/lib/razorpay";
import { sessionPhone } from "@/lib/session";

// Step 2: Razorpay checkout hands the browser an order id, a payment id and a signature. Only a signature that matches
// (HMAC with the key secret) proves the payment happened, so nothing is unlocked until it checks out.
//   POST { razorpay_order_id, razorpay_payment_id, razorpay_signature }

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 100) : "");

export async function POST(request: NextRequest) {
  if (!razorpayConfigured()) return json({ error: "not-configured" }, 503);
  const s = await sessionPhone();
  if (!s.phone) return json({ error: "Please log in again." }, s.status);

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return json({ error: "Invalid body" }, 400); }
  const orderId = str(b.razorpay_order_id), paymentId = str(b.razorpay_payment_id), signature = str(b.razorpay_signature);

  if (!checkoutSignatureValid(orderId, paymentId, signature)) return json({ error: "The payment could not be verified." }, 400);
  const order = await getOrder(orderId);
  if (!order || order.phone !== s.phone) return json({ error: "Unknown order." }, 404); // someone else's order is never revealed or applied

  const r = await fulfilOrder(orderId, paymentId, razorpayMode());
  return r.ok ? json({ ok: true, result: r.result }) : json({ error: r.error }, 409);
}
