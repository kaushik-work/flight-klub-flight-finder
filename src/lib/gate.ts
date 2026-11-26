// The fare a visitor tapped "Unlock" on, carried through the plan popup and the sign-up so that, once they have paid,
// that one fare is open and has a price alert already on it.
export type GateCard = {
  origin: string; originName: string; dest: string; city: string; code: string; nights: number; price: number; avg?: number;
};
export type GateOffer = "unlock" | "3m" | "12m";

/** Alert target for the automatic alert: 5% under today's fare, to the nearest 100 rupees. */
export const autoAlertTarget = (price: number) => Math.max(1000, Math.round((price * 0.95) / 100) * 100);

/** Where to land after paying: the finder showing just this fare, so it appears alone in one row. */
export const finderUrl = (c: Pick<GateCard, "origin" | "dest" | "nights">) => `/flight-finder?from=${c.origin}&to=${c.dest}&nights=${c.nights}`;

export function signupUrl(c: GateCard, offer: GateOffer): string {
  const q = new URLSearchParams({
    offer, o: c.origin, on: c.originName, to: c.dest, city: c.city, code: c.code, n: String(c.nights), p: String(Math.round(c.price)),
    ...(c.avg ? { a: String(Math.round(c.avg)) } : {}), next: finderUrl(c),
  });
  return `/signup?${q}`;
}

const slug = /^[a-z0-9-]{2,40}$/;
/** Reads a card back out of the sign-up URL, refusing anything that does not look right. */
export function cardFromParams(sp: Record<string, string | undefined>): { card: GateCard; offer: GateOffer } | null {
  const offer = sp.offer === "unlock" || sp.offer === "3m" || sp.offer === "12m" ? sp.offer : null;
  const n = Number(sp.n), p = Number(sp.p), a = Number(sp.a);
  if (!offer || !sp.o || !sp.to || !slug.test(sp.o) || !slug.test(sp.to) || !(n >= 3 && n <= 7) || !(p > 0 && p < 1_000_000)) return null;
  return {
    offer,
    card: {
      origin: sp.o, originName: (sp.on ?? sp.o).slice(0, 40), dest: sp.to, city: (sp.city ?? sp.to).slice(0, 60), code: (sp.code ?? "").slice(0, 4),
      nights: n, price: p, ...(a > 0 ? { avg: a } : {}),
    },
  };
}
