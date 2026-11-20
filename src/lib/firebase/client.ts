"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";

// These are public identifiers, not secrets. Access is controlled by Firebase Auth rules and authorized domains.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// reCAPTCHA Enterprise site key for App Check (public). Leave unset and App Check stays off.
const appCheckKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_KEY;

// Starts the app once, with App Check attached before any Firebase service is used.
function firebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  const app = initializeApp(config);
  if (typeof window !== "undefined" && appCheckKey) {
    if (process.env.NODE_ENV !== "production") {
      // Development only: the SDK prints a debug token in the console. Register it under
      // App Check -> Manage debug tokens so localhost passes. Never set this in production.
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
        process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN || true;
    }
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckKey), isTokenAutoRefreshEnabled: true });
  }
  return app;
}

export function firebaseAuth() {
  const auth = getAuth(firebaseApp());
  auth.languageCode = "en";
  return auth;
}

export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (process.env.NODE_ENV !== "production") console.warn("Firebase auth error:", code, e);
  const map: Record<string, string> = {
    "auth/invalid-verification-code": "That code is not correct. Check it and try again.",
    "auth/code-expired": "That code has expired. Request a new one.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/invalid-phone-number": "Enter a valid 10-digit mobile number.",
    "auth/credential-already-in-use": "This mobile number is already linked to another account.",
    "auth/account-exists-with-different-credential": "This number belongs to a different sign-in method.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups and try again.",
    "auth/network-request-failed": "Network problem. Check your connection and try again.",
    "auth/captcha-check-failed": "Security check failed. Refresh the page and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled yet.",
    "auth/billing-not-enabled": "SMS to real numbers needs the Firebase Blaze plan. Only test numbers work until then.",
    "auth/quota-exceeded": "The SMS limit for today has been reached. Try again later.",
    "auth/missing-phone-number": "Enter your mobile number.",
    "auth/internal-error": "Firebase could not send the code. Check the phone sign-in setup and try again.",
    "auth/unauthorized-domain": "This domain is not authorised in Firebase yet.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

// Trade the signed-in Firebase user for the server's httpOnly session cookie.
// Returns an error message, or null on success. A 503 (server key not set) is tolerated in development only.
export async function startSession(): Promise<string | null> {
  const user = firebaseAuth().currentUser;
  if (!user) return "Please sign in again.";
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
  if (res.ok) return null;
  if (res.status === 503 && process.env.NODE_ENV !== "production") return null;
  const b = await res.json().catch(() => ({}));
  return (b as { error?: string }).error ?? "Could not start your session.";
}
