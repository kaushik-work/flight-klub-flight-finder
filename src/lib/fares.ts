// Swap this module for a real fares API/DB later; the UI only depends on these types.
export type Fare = {
  code: string;
  city: string;
  country: string;
  airline: string;
  stops: number;
  hours: number;
  nights: number;
  price: number; // INR, round trip
  month: string; // e.g. "2027-02"
  gradient: string;
  intl?: boolean;
};

export const ORIGINS = [
  "Bangalore", "Delhi", "Mumbai", "Hyderabad", "Chennai", "Kolkata", "Pune", "Kochi",
];

export const MONTHS = ["2026-11", "2026-12", "2027-01", "2027-02", "2027-03"];

export function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
}

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

const g = (a: string, b: string) => `linear-gradient(135deg, ${a}, ${b})`;

const INTL: Fare[] = [
  { code: "CMB", city: "Colombo", country: "Sri Lanka", airline: "SriLankan", stops: 0, hours: 1.5, nights: 5, price: 21114, month: "2027-02", gradient: g("#8b1d24", "#e06b5a") },
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", airline: "AirAsia", stops: 0, hours: 4.5, nights: 5, price: 23840, month: "2026-12", gradient: g("#0f172a", "#8b1d24") },
  { code: "BKK", city: "Bangkok", country: "Thailand", airline: "Thai Lion Air", stops: 0, hours: 3.8, nights: 5, price: 24960, month: "2027-01", gradient: g("#6b141a", "#f8a49d") },
  { code: "SIN", city: "Singapore", country: "Singapore", airline: "Scoot", stops: 0, hours: 4.5, nights: 5, price: 26420, month: "2027-03", gradient: g("#371210", "#d33a3c") },
  { code: "HKT", city: "Phuket", country: "Thailand", airline: "IndiGo", stops: 1, hours: 7.2, nights: 5, price: 27150, month: "2026-11", gradient: g("#aa3438", "#fed2cd") },
  { code: "DPS", city: "Bali", country: "Indonesia", airline: "Batik Air", stops: 1, hours: 9.4, nights: 7, price: 31900, month: "2027-02", gradient: g("#431614", "#e66e68") },
  { code: "SGN", city: "Ho Chi Minh City", country: "Vietnam", airline: "VietJet", stops: 0, hours: 5, nights: 5, price: 29780, month: "2027-01", gradient: g("#8c0010", "#f8a49d") },
  { code: "DXB", city: "Dubai", country: "UAE", airline: "Emirates", stops: 0, hours: 3.8, nights: 5, price: 33250, month: "2026-12", gradient: g("#0f172a", "#c53637") },
  { code: "AUH", city: "Abu Dhabi", country: "UAE", airline: "Etihad", stops: 0, hours: 3.9, nights: 5, price: 34100, month: "2027-03", gradient: g("#371210", "#e06b5a") },
  { code: "HAN", city: "Hanoi", country: "Vietnam", airline: "VietJet", stops: 1, hours: 8.1, nights: 7, price: 35600, month: "2027-02", gradient: g("#6b141a", "#d33a3c") },
  { code: "MLE", city: "Maldives", country: "Maldives", airline: "IndiGo", stops: 0, hours: 2.3, nights: 3, price: 36800, month: "2026-11", gradient: g("#8b1d24", "#fdf2f2") },
  { code: "HKG", city: "Hong Kong", country: "Hong Kong", airline: "Cathay Pacific", stops: 1, hours: 8.6, nights: 5, price: 41200, month: "2027-01", gradient: g("#040609", "#8b1d24") },
  { code: "NRT", city: "Tokyo", country: "Japan", airline: "Singapore Airlines", stops: 1, hours: 13.5, nights: 7, price: 58900, month: "2027-03", gradient: g("#040609", "#d33a3c") },
  { code: "LHR", city: "London", country: "United Kingdom", airline: "British Airways", stops: 0, hours: 10.2, nights: 7, price: 64300, month: "2027-02", gradient: g("#0f172a", "#aa3438") },
  { code: "CDG", city: "Paris", country: "France", airline: "Air France", stops: 1, hours: 12.8, nights: 7, price: 67450, month: "2026-12", gradient: g("#431614", "#f8a49d") },
  { code: "RUN", city: "Réunion", country: "France", airline: "Air Austral", stops: 1, hours: 14, nights: 7, price: 210781, month: "2027-01", gradient: g("#371210", "#fed2cd") },
];

const DOMESTIC: Fare[] = [
  { code: "GOI", city: "Goa", country: "India", airline: "IndiGo", stops: 0, hours: 1.2, nights: 3, price: 3890, month: "2026-12", gradient: g("#8b1d24", "#f8a49d"), intl: false },
  { code: "DEL", city: "Delhi", country: "India", airline: "Air India", stops: 0, hours: 2.8, nights: 3, price: 5240, month: "2027-01", gradient: g("#0f172a", "#8b1d24"), intl: false },
  { code: "BOM", city: "Mumbai", country: "India", airline: "Akasa Air", stops: 0, hours: 1.8, nights: 3, price: 4120, month: "2027-02", gradient: g("#371210", "#e06b5a"), intl: false },
];

export const FARES: Fare[] = [...INTL.map((f) => ({ ...f, intl: true })), ...DOMESTIC];

export function dateRange(month: string, nights: number, seed: string) {
  const [y, mo] = month.split("-").map(Number);
  const day = 4 + ((seed.charCodeAt(0) + seed.charCodeAt(1)) % 17);
  const a = new Date(y, mo - 1, day);
  const b = new Date(y, mo - 1, day + nights);
  const f = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short" });
  return `${f(a)} – ${f(b)}`;
}

export function fareFor(f: Fare, month: string | null, nights: number | null) {
  // Deterministic indicative adjustment so month/trip-length chips feel live until real data exists.
  let p = f.price;
  if (month && month !== f.month) p = Math.round((p * (1 + (MONTHS.indexOf(month) % 3) * 0.06 + 0.04)) / 10) * 10;
  if (nights && nights !== f.nights) p = Math.round((p * (1 + Math.abs(nights - f.nights) * 0.015)) / 10) * 10;
  const m = month ?? f.month;
  return { ...f, price: p, nights: nights ?? f.nights, dates: dateRange(m, nights ?? f.nights, f.code) };
}
