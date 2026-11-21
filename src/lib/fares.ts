// Pure helpers and types shared by server and client. Real fares come from src/lib/flight-fares/store.ts.

export type Origin = { slug: string; name: string; code: string };

// The cities the fare scraper covers.
export const ORIGINS: Origin[] = [
  { slug: "bangalore", name: "Bangalore", code: "BLR" },
  { slug: "mumbai", name: "Mumbai", code: "BOM" },
  { slug: "delhi", name: "Delhi", code: "DEL" },
  { slug: "hyderabad", name: "Hyderabad", code: "HYD" },
  { slug: "chennai", name: "Chennai", code: "MAA" },
  { slug: "kolkata", name: "Kolkata", code: "CCU" },
  { slug: "pune", name: "Pune", code: "PNQ" },
  { slug: "ahmedabad", name: "Ahmedabad", code: "AMD" },
];
export const DEFAULT_ORIGIN = ORIGINS[0];

// Airport coordinates, used to pick the nearest departure city from a visitor's location.
const AIRPORT: Record<string, [number, number]> = {
  bangalore: [13.1986, 77.7066], mumbai: [19.0896, 72.8656], delhi: [28.5562, 77.1], hyderabad: [17.2403, 78.4294],
  chennai: [12.9941, 80.1709], kolkata: [22.6547, 88.4467], pune: [18.5821, 73.9197], ahmedabad: [23.0772, 72.6347],
};

const km = (a: [number, number], b: [number, number]) => {
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/** The covered departure city nearest to a point, or null when none is within maxKm (e.g. the visitor is abroad). */
export function nearestOrigin(lat: number, lng: number, maxKm = 1000): Origin | null {
  let best: { o: Origin; d: number } | null = null;
  for (const o of ORIGINS) {
    const d = km([lat, lng], AIRPORT[o.slug]);
    if (!best || d < best.d) best = { o, d };
  }
  return best && best.d <= maxKm ? best.o : null;
}

export function findOrigin(v?: string | null): Origin | undefined {
  const s = v?.trim().toLowerCase();
  return ORIGINS.find((o) => o.slug === s || o.name.toLowerCase() === s);
}

export type Dest = { slug: string; city: string; intl: boolean };

const d = (slug: string, city: string, intl = true): Dest => ({ slug, city, intl });

// Destinations the scraper prices. Used for links, the footer and search boxes; prices come from the database.
export const DESTINATIONS: Dest[] = [
  d("colombo", "Colombo"), d("kathmandu", "Kathmandu"), d("singapore", "Singapore"), d("bangkok", "Bangkok"),
  d("kuala-lumpur", "Kuala Lumpur"), d("phuket", "Phuket"), d("ho-chi-minh-city", "Ho Chi Minh City"),
  d("maldives", "Maldives"), d("bali", "Bali"), d("hanoi", "Hanoi"), d("dubai", "Dubai"), d("abu-dhabi", "Abu Dhabi"),
  d("milan", "Milan"), d("zurich", "Zurich"), d("mauritius", "Mauritius"), d("tokyo", "Tokyo"), d("rome", "Rome"),
  d("paris", "Paris"), d("london", "London"), d("osaka", "Osaka"), d("munich", "Munich"), d("amsterdam", "Amsterdam"),
  d("reunion", "Réunion"),
  d("mumbai", "Mumbai", false), d("delhi", "Delhi", false), d("chennai", "Chennai", false), d("kolkata", "Kolkata", false),
];

/** One priced round trip for an origin. Short keys keep the payload small. */
export type Row = {
  id: string;
  d: string; // destination slug
  city: string;
  code: string;
  country: string;
  intl: boolean;
  dep: string; // YYYY-MM-DD
  ret: string;
  month: string; // YYYY-MM
  nights: number;
  price: number;
  airline: string;
  stops: number | null; // null = unknown, never assume direct
  mins: number | null; // outbound duration
  seen: string; // when the fare was observed
};

/** The cheapest fare (and the average) for one origin to one destination. */
export type Route = {
  o: string; // origin slug
  d: string;
  city: string;
  code: string;
  country: string;
  intl: boolean;
  price: number;
  avg: number;
  n: number;
  nights: number;
  dep: string;
  ret: string;
  month: string;
  airline: string;
  stops: number | null;
  mins: number | null;
  seen: string;
};

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo >= 1 && mo <= 12 ? `${MON[mo - 1]} ${y}` : m;
}

const parts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
};

/** "3 – 9 Nov 2026", collapsing month and year when shared. */
export function formatRange(from: string, to: string) {
  const a = parts(from), b = parts(to);
  if (!a || !b) return from;
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${b.d} ${MON[a.m]} ${a.y}`;
  if (a.y === b.y) return `${a.d} ${MON[a.m]} – ${b.d} ${MON[b.m]} ${a.y}`;
  return `${a.d} ${MON[a.m]} ${a.y} – ${b.d} ${MON[b.m]} ${b.y}`;
}

/** "19 Nov 2026", read in UTC so server and browser always agree. */
export function formatDay(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const x = new Date(t);
  return `${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function formatDuration(mins: number | null) {
  if (mins === null || !Number.isFinite(mins) || mins <= 0) return null;
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatStops(stops: number | null) {
  if (stops === null || stops < 0) return null;
  return stops === 0 ? "Direct" : stops === 1 ? "1 stop" : `${stops} stops`;
}

/** % the cheapest fare sits below the average of every date we priced for that route. */
export const savingPct = (r: { price: number; avg: number }) => Math.max(0, Math.round((1 - r.price / r.avg) * 100));

const GRADS = [
  ["#8b1d24", "#e06b5a"], ["#0f172a", "#8b1d24"], ["#6b141a", "#f8a49d"], ["#371210", "#d33a3c"],
  ["#aa3438", "#fed2cd"], ["#431614", "#e66e68"], ["#8c0010", "#f8a49d"], ["#040609", "#aa3438"],
];
export function gradientFor(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = GRADS[h % GRADS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export const destName = (slug: string) => DESTINATIONS.find((x) => x.slug === slug)?.city ?? slug;
export const resolveDest = (v: string | undefined, rows: { d: string; code: string }[]) => {
  const s = v?.trim().toLowerCase();
  if (!s) return "";
  return rows.find((r) => r.d === s || r.code.toLowerCase() === s)?.d ?? "";
};

/** Opens this exact round trip (route and dates) on the booking site. Only for members: the URL carries the dates. */
export const fareLink = (originCode: string, destCode: string, dep: string, ret: string) =>
  `https://www.google.com/travel/flights?q=Flights%20to%20${destCode}%20from%20${originCode}%20on%20${dep}%20through%20${ret}`;
