import "server-only";
import { cookies } from "next/headers";
import { adminAuth, SESSION_COOKIE } from "@/lib/firebase/admin";

/** The verified mobile number of the logged-in visitor, or the HTTP status to answer with (503: server login not set up). */
export async function sessionPhone(): Promise<{ phone: string; status?: undefined } | { phone?: undefined; status: number }> {
  const auth = adminAuth();
  if (!auth) return { status: 503 };
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return { status: 401 };
  try {
    const d = await auth.verifySessionCookie(value, true);
    return d.phone_number ? { phone: d.phone_number } : { status: 403 };
  } catch { return { status: 401 }; }
}
