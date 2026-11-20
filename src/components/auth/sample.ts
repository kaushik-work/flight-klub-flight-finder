import { ORIGINS, savingPct, type Route } from "@/lib/fares";

export type Sample = { from: string; fromCity: string; to: string; toCity: string; price: number; avg: number; saving: number };

const CODE: Record<string, string> = {
  bangalore: "BLR", mumbai: "BOM", delhi: "DEL", hyderabad: "HYD", chennai: "MAA", kolkata: "CCU", pune: "PNQ", ahmedabad: "AMD",
};

/** The best real deal in the data (largest saving below the route's own average), for the auth page ticket. */
export function pickSample(routes: Route[]): Sample | null {
  const best = routes
    .filter((r) => r.intl && r.n >= 5 && CODE[r.o])
    .sort((a, b) => savingPct(b) - savingPct(a))[0];
  if (!best) return null;
  return {
    from: CODE[best.o], fromCity: ORIGINS.find((o) => o.slug === best.o)?.name ?? best.o,
    to: best.code, toCity: best.city, price: best.price, avg: best.avg, saving: savingPct(best),
  };
}
