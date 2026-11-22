export const SITE_NAME = "Flight Klub";
// Set NEXT_PUBLIC_SITE_URL in production (e.g. https://www.yourdomain.com).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.flightklub.com").replace(/\/$/, "");
export const PHONE_DISPLAY = "+91 87229 36433";
export const PHONE_TEL = "+918722936433";
export const WHATSAPP_URL = "https://wa.me/918722936433?text=" + encodeURIComponent("Hi Flight Klub, I need help with a flight.");
export const EMAIL = "contact@flightklub.com";
export const ADDRESS = "Tejas Arcade, 527/B, Dr Rajkumar Rd, A Block, Milk Colony, 2nd Stage, Rajajinagar, Bengaluru, Karnataka 560010";
export const GSTIN = "29AAZFT2848L1Z1";
export const INSTAGRAM_URL = "https://www.instagram.com/flight_klub_/";
export const SITE_DESC =
  "Find the cheapest destinations and the cheapest months to fly from Bangalore, Delhi, Mumbai and more. Compare round-trip fares in rupees and plan your trip around the best price.";

export const jsonLd = (data: object) => ({
  __html: JSON.stringify(data).replace(/</g, "\\u003c"),
});

// Limited paid membership. SIGNUPS_TAKEN must come from a real count (env now, database later).
// While it is unset we only say "first 1,000 members" and never show a made-up remaining number.
export const SIGNUP_LIMIT = 1000;
// Two plans. Prices are in rupees and the validity runs from the day of payment.
export const PLANS = [
  { id: "3m", months: 3, price: 399, name: "3 months" },
  { id: "12m", months: 12, price: 999, name: "12 months" },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];
export const planById = (id?: string | null) => PLANS.find((p) => p.id === id) ?? PLANS[1];
export const MEMBERSHIP_PRICE = PLANS[0].price; // the lowest price, for "from" copy
export const MEMBERSHIP_LABEL = "from ₹399";
export const PLANS_SENTENCE = "₹399 for 3 months or ₹999 for 12 months";
/** A date `months` months after `from`, clamped to the end of a shorter month. */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}
const taken = process.env.NEXT_PUBLIC_SIGNUPS_TAKEN;
export const SIGNUPS_TAKEN = taken && /^\d+$/.test(taken) ? Math.min(Number(taken), SIGNUP_LIMIT) : null;
export const SPOTS_LEFT = SIGNUPS_TAKEN === null ? null : SIGNUP_LIMIT - SIGNUPS_TAKEN;
export const SIGNUPS_FULL = SPOTS_LEFT === 0;
