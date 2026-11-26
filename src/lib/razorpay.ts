import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay over plain REST (no SDK to install). Settings, all server-side:
//   RAZORPAY_KEY_ID          rzp_test_… or rzp_live_…   (the id is not secret; the browser needs it to open checkout)
//   RAZORPAY_KEY_SECRET      never sent to the browser
//   RAZORPAY_WEBHOOK_SECRET  the secret set on the webhook in the Razorpay dashboard
// With the first two unset the site stays in demo checkout.

const API = "https://api.razorpay.com/v1";

export const razorpayConfigured = () => !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
/** "live" only for a live key; a test key reports "test" so test money is never counted as collected money. */
export const razorpayMode = (): "live" | "test" => (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") ? "live" : "test");

const authHeader = () => "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: authHeader(), "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: { description?: string } }).error?.description ?? `Razorpay ${res.status}`);
  return body as T;
}

/** Amount is in rupees here; Razorpay wants paise. */
export function createOrder(rupees: number, receipt: string, notes: Record<string, string>) {
  return call<{ id: string; amount: number; currency: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: Math.round(rupees * 100), currency: "INR", receipt: receipt.slice(0, 40), notes }),
  });
}

export const fetchPayment = (id: string) =>
  call<{ id: string; order_id: string; status: string; amount: number; currency: string; method?: string }>(`/payments/${encodeURIComponent(id)}`);

const safeEqualHex = (a: string, b: string) => {
  const x = Buffer.from(a, "utf8"), y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Checkout returns order_id, payment_id and a signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function checkoutSignatureValid(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !orderId || !paymentId || !signature) return false;
  return safeEqualHex(createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex"), signature);
}

/** Webhooks are signed over the raw request body with the webhook secret. */
export function webhookSignatureValid(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}
