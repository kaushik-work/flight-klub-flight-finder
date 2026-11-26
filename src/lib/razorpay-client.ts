// Browser side of a Razorpay payment. The server decides the price and creates the order; this only opens checkout and
// hands the signed result back to the server, which is what actually unlocks anything.

export type PayWant = { kind: "plan"; planId: string } | { kind: "unlock"; key: string };
export type PayWho = { name: string; city: string; email?: string };
export type PayResult =
  | { kind: "plan"; plan: { id: string; since: string; renews: string } }
  | { kind: "unlock"; trial: { bought: number; unlocks: { key: string; until: string }[] } };
export type PayOutcome =
  | { status: "paid"; result: PayResult }
  | { status: "demo" } // no Razorpay keys on the server: the caller uses its demo checkout
  | { status: "cancelled" }
  | { status: "error"; message: string };

type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RzpInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => RzpInstance } }

let script: Promise<boolean> | null = null;
function loadCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  script ??= new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { script = null; resolve(false); };
    document.head.appendChild(s);
  });
  return script;
}

const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export async function payWithRazorpay(want: PayWant, who: PayWho): Promise<PayOutcome> {
  let res: Response;
  try { res = await post("/api/payments/order", { ...want, ...who }); } catch { return { status: "error", message: "Could not reach the server. Nothing was charged. Please try again." }; }
  if (res.status === 503) return { status: "demo" };
  const order = await res.json().catch(() => ({}));
  if (!res.ok) return { status: "error", message: (order as { error?: string }).error ?? "Could not start the payment. Nothing was charged." };
  if (!(await loadCheckout()) || !window.Razorpay) return { status: "error", message: "Could not load the payment window. Check your connection and try again. Nothing was charged." };

  return new Promise<PayOutcome>((resolve) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Flight Klub",
      description: want.kind === "plan" ? "Membership" : "Unlock exact dates for one fare",
      prefill: { name: who.name, email: who.email, contact: order.phone },
      theme: { color: "#8b1d24" },
      modal: { ondismiss: () => resolve({ status: "cancelled" }) },
      handler: async (r: RzpResponse) => {
        try {
          const v = await post("/api/payments/verify", r);
          const body = await v.json().catch(() => ({}));
          if (v.ok) resolve({ status: "paid", result: (body as { result: PayResult }).result });
          else resolve({ status: "error", message: (body as { error?: string }).error ?? "We could not confirm the payment." });
        } catch {
          resolve({ status: "error", message: "We could not confirm the payment. If money was taken it will be applied shortly; do not pay twice." });
        }
      },
    });
    // A failed attempt is shown inside Razorpay's own window, where the person can retry; we only hear the outcome
    // (paid, or the window closed). Resolving here would orphan a retry that then succeeds.
    rzp.on("payment.failed", () => {});
    rzp.open();
  });
}
