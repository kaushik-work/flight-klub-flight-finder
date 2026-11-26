import type { Db } from "mongodb";
import { getFaresDb } from "@/lib/flight-fares/store";
import { PLANS } from "@/lib/site";

// What the CRM reports on. Two collections, written on the server from a verified session, never from the browser alone:
//   members   { _id: "+91…", name, email, city, plan, trial, createdAt }   one per account
//   payments  { phone, kind: "plan" | "unlock", amount, planId, cardKey, method, mode, at }   one per payment
// Amounts come from our own price list here, not from anything the browser sends. `mode` is "demo" until real checkout is on,
// so demo money can never be mistaken for collected money in the reports.

/** Same database as the fares unless CRM_DB_NAME says otherwise (used to keep local demo data apart). */
export async function getCrmDb(): Promise<Db> {
  const db = await getFaresDb();
  const name = process.env.CRM_DB_NAME;
  return name ? db.client.db(name) : db;
}

export const UNLOCK_PRICE = 89; // rupees, GST included
export const PAYMENT_MODE = process.env.PAYMENTS_LIVE === "true" ? "live" : "demo";

export type MemberInput = { name: string; email?: string; city: string };

export async function recordMember(phone: string, m: MemberInput, extra: { plan?: string; trial?: boolean } = {}) {
  const db = await getCrmDb();
  const now = new Date().toISOString();
  await db.collection<{ _id: string }>("members").updateOne(
    { _id: phone },
    { $set: { name: m.name, city: m.city, ...(m.email ? { email: m.email } : {}), ...extra, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

export async function recordPayment(phone: string, p: { kind: "plan"; planId: string; method?: string } | { kind: "unlock"; cardKey: string; method?: string }) {
  const amount = p.kind === "plan" ? PLANS.find((x) => x.id === p.planId)?.price : UNLOCK_PRICE;
  if (!amount) return false;
  await (await getCrmDb()).collection("payments").insertOne({ phone, ...p, amount, mode: PAYMENT_MODE, at: new Date().toISOString() });
  return true;
}
