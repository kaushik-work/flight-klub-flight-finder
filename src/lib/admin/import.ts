import "server-only";
import { getCrmDb } from "@/lib/crm";
import { adminAuth } from "@/lib/firebase/admin";

// Signups made before the site recorded them (and any it missed) live in Firebase's own list of verified mobile numbers.
// This copies them into the CRM's "members" collection. It only ever ADDS: a person already recorded keeps their name,
// city and plan, and nothing is overwritten. City and plan are not in Firebase, so imported people show them as blank.

export type ImportResult = { ok: true; seen: number; added: number } | { ok: false; error: string };

export async function importFirebaseUsers(): Promise<ImportResult> {
  const auth = adminAuth();
  if (!auth) return { ok: false, error: "Firebase server settings (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not set on this server." };
  try {
    const members = (await getCrmDb()).collection<{ _id: string }>("members");
    let seen = 0, added = 0, token: string | undefined;
    do {
      const page = await auth.listUsers(1000, token);
      const ops = page.users.filter((u) => u.phoneNumber).map((u) => ({
        updateOne: {
          filter: { _id: u.phoneNumber! },
          update: {
            $setOnInsert: {
              name: u.displayName ?? "", email: u.email ?? "", city: "", source: "firebase",
              createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : new Date().toISOString(),
            },
          },
          upsert: true,
        },
      }));
      seen += ops.length;
      if (ops.length) added += (await members.bulkWrite(ops, { ordered: false })).upsertedCount;
      token = page.pageToken;
    } while (token);
    await (await getCrmDb()).collection<{ _id: string }>("crm_meta").updateOne({ _id: "firebaseSync" }, { $set: { at: new Date().toISOString(), seen, added } }, { upsert: true });
    return { ok: true, seen, added };
  } catch {
    return { ok: false, error: "Could not read the Firebase user list." };
  }
}

/** Runs the import at most every 10 minutes when the Signups screen is opened, so it stays current without a button press. */
export async function syncIfStale(): Promise<void> {
  try {
    const meta = await (await getCrmDb()).collection<{ _id: string; at?: string }>("crm_meta").findOne({ _id: "firebaseSync" });
    if (meta?.at && Date.now() - new Date(meta.at).getTime() < 10 * 60_000) return;
    await importFirebaseUsers();
  } catch {}
}
