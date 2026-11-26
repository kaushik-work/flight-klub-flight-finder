import type { Db } from "mongodb";

// The date-unlock trial, stored per verified mobile number in the "date_unlocks" collection (same database as the fares).
// One document per account:  { _id: "+91…", bought: 2, unlocks: [{ key, until, at, paid }] }
// `bought` only ever goes up, so the three trial unlocks can never be bought again by logging out and in.

export const COLLECTION = "date_unlocks";
export const TRIAL_UNLOCKS = 3;
export const TRIAL_DAYS = 7;
export type StoredUnlock = { key: string; until: string; at: string; paid: string };
export type StoredTrial = { bought: number; unlocks: { key: string; until: string }[] };

const KEY = /^[a-z0-9-]{2,40}:[a-z0-9-]{2,40}:\d{1,2}$/; // origin:destination:nights

export const validKey = (k: unknown): k is string => typeof k === "string" && KEY.test(k);

const shape = (d: { bought?: number; unlocks?: StoredUnlock[] } | null): StoredTrial | null =>
  d ? { bought: d.bought ?? 0, unlocks: (d.unlocks ?? []).map((u) => ({ key: u.key, until: u.until })) } : null;

export async function getTrial(db: Db, phone: string): Promise<StoredTrial | null> {
  return shape(await db.collection<{ _id: string; bought: number; unlocks: StoredUnlock[] }>(COLLECTION).findOne({ _id: phone }));
}

export type UnlockResult =
  | { ok: true; trial: StoredTrial; already: boolean }
  | { ok: false; reason: "used-up" | "bad-key"; trial: StoredTrial | null };

/**
 * Record one paid unlock. Atomic: the update only matches while fewer than three have been bought, so two
 * tabs paying at once cannot take a fourth. A card that is still open is returned as it is, with no new charge.
 * `paid` says how it was paid ("demo" until the real checkout verifies a payment before calling this).
 */
export async function unlockCard(db: Db, phone: string, key: string, paid: string, now = new Date()): Promise<UnlockResult> {
  if (!validKey(key)) return { ok: false, reason: "bad-key", trial: await getTrial(db, phone) };
  const col = db.collection<{ _id: string; bought: number; unlocks: StoredUnlock[] }>(COLLECTION);
  await col.updateOne({ _id: phone }, { $setOnInsert: { bought: 0, unlocks: [] } }, { upsert: true });

  const current = await col.findOne({ _id: phone });
  const open = current?.unlocks.find((u) => u.key === key && new Date(u.until) > now);
  if (open) return { ok: true, trial: shape(current)!, already: true };

  const until = new Date(now.getTime() + TRIAL_DAYS * 86_400_000).toISOString();
  const updated = await col.findOneAndUpdate(
    { _id: phone, bought: { $lt: TRIAL_UNLOCKS } },
    { $inc: { bought: 1 }, $push: { unlocks: { key, until, at: now.toISOString(), paid } } },
    { returnDocument: "after" },
  );
  if (!updated) return { ok: false, reason: "used-up", trial: shape(current) };
  return { ok: true, trial: shape(updated)!, already: false };
}
