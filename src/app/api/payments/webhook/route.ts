import { type NextRequest } from "next/server";
import { fulfilOrder, getOrder } from "@/lib/payments";
import { fetchPayment, razorpayConfigured, razorpayMode, webhookSignatureValid } from "@/lib/razorpay";

// Razorpay calls this when a payment is captured, so a person who pays and then closes the tab still gets what they paid for.
// Set it up in the Razorpay dashboard: URL https://<your site>/api/payments/webhook, event payment.captured,
// and put the secret you choose there into RAZORPAY_WEBHOOK_SECRET.
// The body is signed, so anything not signed with that secret is ignored. The payment is also fetched from Razorpay
// itself before anything is applied, so even a signed message cannot claim an amount that was not paid.

export async function POST(request: NextRequest) {
  if (!razorpayConfigured()) return new Response("not configured", { status: 503 });
  const raw = await request.text();
  if (!webhookSignatureValid(raw, request.headers.get("x-razorpay-signature"))) return new Response("bad signature", { status: 400 });

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  try { event = JSON.parse(raw); } catch { return new Response("bad body", { status: 400 }); }
  if (event.event !== "payment.captured") return new Response("ignored", { status: 200 });

  const paymentId = event.payload?.payment?.entity?.id;
  const orderId = event.payload?.payment?.entity?.order_id;
  if (!paymentId || !orderId) return new Response("ignored", { status: 200 });

  try {
    const order = await getOrder(orderId);
    if (!order) return new Response("unknown order", { status: 200 }); // not ours; do not make Razorpay retry
    const p = await fetchPayment(paymentId);
    if (p.order_id !== orderId || p.status !== "captured" || p.amount !== Math.round(order.amount * 100) || p.currency !== "INR") {
      return new Response("payment does not match the order", { status: 200 });
    }
    const r = await fulfilOrder(orderId, paymentId, razorpayMode(), p.method);
    return new Response(r.ok ? "ok" : r.error, { status: 200 });
  } catch {
    return new Response("try again", { status: 500 }); // Razorpay retries on a non-2xx
  }
}
