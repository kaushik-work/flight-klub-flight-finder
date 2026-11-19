export const SITE_NAME = "Flight Klub";
// Set NEXT_PUBLIC_SITE_URL in production (e.g. https://www.yourdomain.com).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.flightklub.com").replace(/\/$/, "");
export const PHONE_DISPLAY = "+91 87229 36433";
export const PHONE_TEL = "+918722936433";
export const WHATSAPP_URL = "https://wa.me/918722936433?text=" + encodeURIComponent("Hi Flight Klub, I need help with a flight.");
export const EMAIL = "contact@flightklub.com";
export const SITE_DESC =
  "Find the cheapest destinations and the cheapest months to fly from Bangalore, Delhi, Mumbai and more. Compare round-trip fares in rupees and plan your trip around the best price.";

export const jsonLd = (data: object) => ({
  __html: JSON.stringify(data).replace(/</g, "\\u003c"),
});

// Limited paid membership. SIGNUPS_TAKEN must come from a real count (env now, database later).
// While it is unset we only say "first 1,000 members" and never show a made-up remaining number.
export const SIGNUP_LIMIT = 1000;
export const MEMBERSHIP_PRICE = 399; // INR per year
export const MEMBERSHIP_LABEL = "₹399/year";
const taken = process.env.NEXT_PUBLIC_SIGNUPS_TAKEN;
export const SIGNUPS_TAKEN = taken && /^\d+$/.test(taken) ? Math.min(Number(taken), SIGNUP_LIMIT) : null;
export const SPOTS_LEFT = SIGNUPS_TAKEN === null ? null : SIGNUP_LIMIT - SIGNUPS_TAKEN;
export const SIGNUPS_FULL = SPOTS_LEFT === 0;
