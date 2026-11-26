import "server-only";
import { getCrmDb, priceOf, recordMember, recordPayment, type PaymentMode } from "@/lib/crm";
import { getFaresDb } from "@/lib/flight-fares/store";
import { addMonths, PLANS } from "@/lib/site";
import { getTrial, unlockCard, validKey, type StoredTrial } from "@/lib/unlocks";

// Orders: what a person is about to pay for, created on the server BEFORE checkout opens, so the amount and the thing
// being bought can never come from the browser. An order is fulfilled once, by whichever arrives first: the browser's
// signed confirmation or Razorpay's webhook.
//   payment_orders { _id: razorpayOrderId, phone, kind, planId | cardKey, amount, member:{name,city,email}, status, … }
//   status: created -> fulfilling -> paid     (needs-review if a paid order could not be applied: refund by hand)

export type OrderRow = {
  _id: string; phone: string; amount: number; createdAt: string;
  status: "created" | "fulfilling" | "paid" | "needs-review";
  member: { name: string; city: string; email?: string };
  paymentId?: string; paidAt?: string; result?: Fulfilled; error?: string;
} & ({ kind: "plan"; planId: string } | { kind: "unlock"; cardKey: string });

export type Fulfilled =
  | { kind: "plan"; plan: { id: string; since: string; renews: string } }
  | { kind: "unlock"; trial: StoredTrial };

const orders = async () => (await getCrmDb()).collection<OrderRow>("payment_orders");

export async function saveOrder(row: OrderRow) { await (await orders()).insertOne(row); }

export type Want = { kind: "plan"; planId: string } | { kind: "unlock"; cardKey: string };

/** Checks a purchase is allowed and returns its price, or the reason it is not. */
export async function quote(phone: string, want: Want): Promise<{ ok: true; amount: number } | { ok: false; error: string }> {
  if (want.kind === "plan") {
    if (!PLANS.some((p) => p.id === want.planId)) return { ok: false, error: "Unknown plan." };
    return { ok: true, amount: priceOf(want)! };
  }
  if (!validKey(want.cardKey)) return { ok: false, error: "Unknown card." };
  const t = await getTrial(await getFaresDb(), phone);
  if (t && t.bought >= 3) return { ok: false, error: "All 3 trial unlocks are used. Choose a plan to see more dates." };
  return { ok: true, amount: priceOf(want)! };
}

/**
 * Apply a verified payment to the account, exactly once. Safe to call again (a retry, or the webhook after the browser):
 * a second call returns the stored result and changes nothing.
 */
export async function fulfilOrder(orderId: string, paymentId: string, mode: PaymentMode, method?: string): Promise<{ ok: true; result: Fulfilled; phone: string } | { ok: false; error: string }> {
  const col = await orders();
  const claimed = await col.findOneAndUpdate({ _id: orderId, status: "created" }, { $set: { status: "fulfilling", paymentId } }, { returnDocument: "after" });
  if (!claimed) {
    const existing = await col.findOne({ _id: orderId });
    if (!existing) return { ok: false, error: "Unknown order." };
    if (existing.status === "paid" && existing.result) return { ok: true, result: existing.result, phone: existing.phone };
    return { ok: false, error: existing.status === "needs-review" ? "This payment needs a manual check. Nothing more is charged." : "This payment is already being processed." };
  }

  try {
    let result: Fulfilled;
    if (claimed.kind === "plan") {
      const plan = PLANS.find((p) => p.id === claimed.planId)!;
      const now = new Date();
      const since = now.toISOString(), renews = addMonths(now, plan.months).toISOString();
      await recordMember(claimed.phone, claimed.member, { plan: plan.id, since, renews });
      await recordPayment(claimed.phone, { kind: "plan", planId: plan.id, method }, { mode, orderId, paymentId });
      result = { kind: "plan", plan: { id: plan.id, since, renews } };
    } else {
      const u = await unlockCard(await getFaresDb(), claimed.phone, claimed.cardKey, `razorpay:${paymentId}`);
      if (!u.ok) throw new Error(u.reason);
      await recordMember(claimed.phone, claimed.member, { trial: true });
      await recordPayment(claimed.phone, { kind: "unlock", cardKey: claimed.cardKey, method }, { mode, orderId, paymentId });
      result = { kind: "unlock", trial: u.trial };
    }
    await col.updateOne({ _id: orderId }, { $set: { status: "paid", paidAt: new Date().toISOString(), result } });
    return { ok: true, result, phone: claimed.phone };
  } catch (e) {
    await col.updateOne({ _id: orderId }, { $set: { status: "needs-review", error: e instanceof Error ? e.message : "failed" } });
    return { ok: false, error: "We received your payment but could not apply it. We will sort it out and refund if needed." };
  }
}

export async function getOrder(orderId: string) { return (await orders()).findOne({ _id: orderId }); }
