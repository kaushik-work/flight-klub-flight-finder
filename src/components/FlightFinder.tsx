"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bell, BellOn, Lock } from "@/components/Icons";
import DestinationPicker, { type DestOption } from "@/components/DestinationPicker";
import PriceRange from "@/components/PriceRange";
import PriceTag from "@/components/PriceTag";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useMemo, useState, useTransition } from "react";
import { useHomeOrigin } from "@/components/location/LocationProvider";
import { alertId, cardKey, isMember, TRIAL_PRICE, TRIAL_UNLOCKS, trialLeft, unlockedUntil, useAuth } from "@/components/auth/AuthProvider";
import UnlockDialog, { type UnlockTarget } from "@/components/auth/UnlockDialog";
import GateModal from "@/components/auth/GateModal";
import type { GateCard } from "@/lib/gate";
import AlertDialog, { type AlertRoute } from "@/components/alerts/AlertDialog";
import { useHydrated, useNow } from "@/lib/useHydrated";
import {
  ORIGINS, type Origin, type Row, fareLink, formatDay, formatDuration, formatRange, formatStops, inr, inrIf, monthLabel,
} from "@/lib/fares";

const seg = (on: boolean) =>
  `font-label h-9 rounded-lg px-4 text-sm font-semibold transition ${
    on ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
  }`;


/** One row per destination: the cheapest that matches. */
function cheapest(rows: Row[]) {
  const best = new Map<string, Row>();
  for (const r of rows) {
    const c = best.get(r.d);
    if (!c || r.price < c.price) best.set(r.d, r);
  }
  return [...best.values()];
}

export default function FlightFinder({
  origin,
  rows,
  baggage = {},
  initialDest = "",
  initialNights = null,
  initialMonth = null,
  fromExplicit = true,
}: {
  origin: Origin;
  rows: Row[];
  baggage?: Record<string, string>;
  initialDest?: string;
  initialNights?: number | null;
  initialMonth?: string | null;
  fromExplicit?: boolean;
}) {
  const router = useRouter();
  const [moving, startMove] = useTransition();
  const auth = useAuth();
  // The login lives in localStorage, so it is only known in the browser. Wait for hydration before using it.
  const hydrated = useHydrated();
  const ready = hydrated && auth.ready;
  const user = hydrated ? auth.user : null;
  const alerts = hydrated ? auth.alerts : [];
  const [alertFor, setAlertFor] = useState<AlertRoute | null>(null);
  const [unlockFor, setUnlockFor] = useState<UnlockTarget | null>(null);
  // A visitor who taps Unlock gets the plan popup for that fare; the fare is carried through sign-up and payment.
  const [gateFor, setGateFor] = useState<GateCard | null>(null);
  const [alertRow, setAlertRow] = useState<Row | null>(null);
  // Which month each card's "best dates" list is showing, keyed by destination and trip length.
  const [cardMonth, setCardMonth] = useState<Record<string, string>>({});
  const member = isMember(user);
  const left = trialLeft(user);
  const now = useNow();
  // Exact dates show for members, and for a trial account on the cards it has unlocked.
  const datesOpen = (f: Row) => member || unlockedUntil(user, cardKey(origin.slug, f.d, f.nights), now) !== null;
  const openUnlock = (f: Row) => setUnlockFor({ key: cardKey(origin.slug, f.d, f.nights), label: `${f.city}, ${f.nights} nights` });
  const { origin: near, setUserOrigin } = useHomeOrigin();

  // No city in the URL: use the nearest airport once it is known.
  useEffect(() => {
    if (fromExplicit || !near || near === origin.slug) return;
    const q = new URLSearchParams(window.location.search);
    q.set("from", near);
    router.replace(`/flight-finder?${q}`);
  }, [fromExplicit, near, origin.slug, router]);
  const [intl, setIntl] = useState(rows.find((r) => r.d === initialDest)?.intl ?? true);
  const [dest, setDest] = useState(initialDest);
  const [nights, setNights] = useState<number | null>(initialNights);
  const [monthPick, setMonth] = useState<string | null>(initialMonth);
  const [sort, setSort] = useState<"cheapest" | "shortest">("cheapest");
  const [direct, setDirect] = useState(false);

  const pool = useMemo(() => rows.filter((r) => r.intl === intl), [rows, intl]);
  const months = useMemo(() => [...new Set(rows.map((r) => r.month))].sort(), [rows]);
  const nightOpts = useMemo(() => [...new Set(rows.map((r) => r.nights))].sort((a, b) => a - b), [rows]);
  const destOptions = useMemo<DestOption[]>(() => {
    const m = new Map<string, DestOption>();
    for (const r of pool) {
      const x = m.get(r.d);
      if (!x) m.set(r.d, { slug: r.d, city: r.city, country: r.country, from: r.price });
      else if (r.price < (x.from ?? Infinity)) x.from = r.price;
    }
    return [...m.values()];
  }, [pool]);
  const counts = useMemo(() => ({
    intl: new Set(rows.filter((r) => r.intl).map((r) => r.d)).size,
    dom: new Set(rows.filter((r) => !r.intl).map((r) => r.d)).size,
  }), [rows]);

  const monthMin = useMemo(() => {
    const m: Record<string, number> = {};
    // Same filters as the cards below, so a month's "from" price is a price you can actually find in that month.
    for (const r of pool) {
      if ((nights && r.nights !== nights) || (dest && r.d !== dest) || (direct && r.stops !== 0)) continue;
      if (m[r.month] === undefined || r.price < m[r.month]) m[r.month] = r.price;
    }
    return m;
  }, [pool, nights, dest, direct]);
  // There is no "any month": one month is always selected, the picked one or else the first month that has fares for these filters.
  const month = useMemo(() => {
    const have = months.filter((m) => monthMin[m] !== undefined);
    return monthPick && have.includes(monthPick) ? monthPick : have[0] ?? null;
  }, [months, monthMin, monthPick]);


  const results = useMemo(() => {
    let r = pool;
    if (month) r = r.filter((x) => x.month === month);
    if (nights) r = r.filter((x) => x.nights === nights);
    if (dest) r = r.filter((x) => x.d === dest);
    if (direct) r = r.filter((x) => x.stops === 0);
    const out = cheapest(r);
    return out.sort((a, b) =>
      sort === "cheapest" ? a.price - b.price : (a.mins ?? Infinity) - (b.mins ?? Infinity) || a.price - b.price,
    );
  }, [pool, month, nights, dest, direct, sort]);

  // Min, average and max fare per destination and trip length, over every priced date. A fare is only compared
  // with trips of the same length, so a 3-night fare is never called cheap against 7-night prices.
  const stats = useMemo(() => {
    const t: Record<string, { sum: number; n: number; min: number; max: number }> = {};
    for (const r of pool) {
      const x = (t[`${r.d}:${r.nights}`] ??= { sum: 0, n: 0, min: Infinity, max: 0 });
      x.sum += r.price; x.n += 1; x.min = Math.min(x.min, r.price); x.max = Math.max(x.max, r.price);
    }
    return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { avg: v.sum / v.n, min: v.min, max: v.max, n: v.n }]));
  }, [pool]);
  // The three cheapest different departure dates for a destination and trip length (a fare is only compared
  // with the same stay), so people see more than the single best day.
  // The cheapest departure dates for a destination and trip length (a fare is only compared with the same stay), kept
  // per month so each month gets its own top three instead of one overall list.
  const datesByMonth = (f: Row) => {
    const best = new Map<string, Row>(); // one row per departure date
    for (const r of pool) {
      if (r.d !== f.d || r.nights !== f.nights || (direct && r.stops !== 0)) continue;
      const c = best.get(r.dep);
      if (!c || r.price < c.price) best.set(r.dep, r);
    }
    const by: Record<string, Row[]> = {};
    for (const r of best.values()) (by[r.month] ??= []).push(r);
    for (const list of Object.values(by)) list.sort((a, b) => a.price - b.price);
    return by;
  };
  const statFor = (f: Row) => stats[`${f.d}:${f.nights}`];
  const cheapestId = useMemo(() => results.reduce<string | null>((m, f) => (m === null || f.price < results.find((x) => x.d === m)!.price ? f.d : m), null), [results]);
  const fastestId = useMemo(() => {
    const timed = results.filter((f) => f.mins);
    return timed.length > 1 ? timed.reduce((m, f) => ((f.mins ?? Infinity) < (m.mins ?? Infinity) ? f : m)).d : null;
  }, [results]);

  const hasAlert = (dest: string) => alerts.some((a) => a.id === alertId(origin.slug, dest));
  const gateCardOf = (f: Row): GateCard => ({ origin: origin.slug, originName: origin.name, dest: f.d, city: f.city, code: f.code, nights: f.nights, price: f.price, avg: statFor(f)?.avg });
  function openAlert(f: Row) {
    setAlertRow(f);
    // A locked fare's price stays hidden in the alert window too.
    const open = datesOpen(f);
    setAlertFor({ origin: origin.slug, originName: origin.name, dest: f.d, city: f.city, code: f.code, price: open ? f.price : undefined, avg: open ? statFor(f)?.avg : undefined });
  }

  const lastSeen = useMemo(() => rows.reduce((m, r) => (r.seen > m ? r.seen : m), ""), [rows]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10">
      <section className="pb-6 pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {intl ? "International" : "Domestic"} flights from {origin.name}
        </h1>
        <p className="mt-2 text-muted-foreground">Cheapest destinations and months, ranked by recent round-trip fares.</p>
      </section>

      <form onSubmit={(e) => e.preventDefault()} className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 sm:items-end lg:grid-cols-[1fr_1fr_auto]">
        <div>
          <span className="font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Flying from</span>
          <DestinationPicker
            value={origin.slug}
            disabled={moving}
            anywhere={null}
            grouped={false}
            showCountry={false}
            searchPlaceholder="Search your city"
            options={ORIGINS.map((o) => ({ slug: o.slug, city: o.name, country: "India", code: o.code }))}
            onChange={(slug) => { if (!slug) return; setUserOrigin(slug); startMove(() => router.push(`/flight-finder?from=${slug}`)); }}
          />
        </div>
        <div>
          <span className="font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Going to</span>
          <DestinationPicker value={dest} onChange={setDest} options={destOptions} maskPrices={!member} anywhere={intl ? "Anywhere abroad" : "Anywhere in India"} />
        </div>
        <div>
          <span className="font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trip length</span>
          <div className="flex h-12 items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {nightOpts.map((n) => (
              <button key={n} type="button" aria-pressed={nights === n} onClick={() => setNights(nights === n ? null : n)} className={`${seg(nights === n)} h-full flex-1 px-4`}>
                {n}N
              </button>
            ))}
          </div>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
          <button onClick={() => { setIntl(true); setDest(""); }} className={seg(intl)}>International ({counts.intl})</button>
          <button onClick={() => { setIntl(false); setDest(""); }} className={seg(!intl)}>Domestic ({counts.dom})</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
            <button onClick={() => setSort("cheapest")} className={seg(sort === "cheapest")}>Cheapest</button>
            <button onClick={() => setSort("shortest")} className={seg(sort === "shortest")}>Shortest flight</button>
          </div>
          <label className="font-label flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold">
            <input type="checkbox" checked={direct} onChange={(e) => setDirect(e.target.checked)} className="h-4 w-4 accent-[#8b1d24]" />
            Direct only
          </label>
        </div>
      </div>

      <section id="months" className="mt-6">
        <h2 className="font-label mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pick a month</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {months.filter((m) => monthMin[m] !== undefined).map((m) => (
            <button key={m} onClick={() => setMonth(m)} className={`shrink-0 rounded-xl border px-4 py-2 text-left transition ${month === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>
              <span className="font-label block text-sm font-semibold">{monthLabel(m)}</span>
              <span className="block text-xs opacity-80">from {inrIf(member, monthMin[m])}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="fares" className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{results.length} destinations</p>
          {ready && !user && (
            <Link href="/signup?next=/flight-finder" className="font-label flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground">
              <Lock className="mr-1.5" />Members unlock exact dates and price-drop alerts · from ₹399<ArrowRight className="ml-1.5" />
            </Link>
          )}
          {user && !member && (
            <button onClick={() => setUnlockFor({ key: "", label: "" })} className="font-label flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground">
              <Lock className="mr-1.5" />{left > 0 ? `Trial: ${left} of ${TRIAL_UNLOCKS} date unlocks left · ₹${TRIAL_PRICE} each` : "Trial used · get a plan for every date"}<ArrowRight className="ml-1.5" />
            </button>
          )}
          {user && alerts.length > 0 && (
            <Link href="/alerts" className="font-label text-xs font-semibold text-primary hover:underline"><BellOn className="mr-1" />{alerts.length} price alert{alerts.length > 1 ? "s" : ""} on<ArrowRight className="ml-1.5" /></Link>
          )}
        </div>

        {results.length === 0 ? (
          <p className="rounded-xl bg-muted p-6 text-muted-foreground">
            {rows.length === 0
              ? `Fares from ${origin.name} are being updated. Please check back shortly.`
              : "No flights match these filters. Try another month or trip length."}
          </p>
        ) : (
          <ul className={`grid gap-5 transition-opacity lg:grid-cols-2 ${moving ? "opacity-50" : ""}`}>
            {results.map((f, i) => {
              const stops = formatStops(f.stops);
              const dur = formatDuration(f.mins);
              const st = statFor(f);
              const open = datesOpen(f);
              return (
                <li key={f.d} style={{ "--i": i, display: "flex" } as CSSProperties} className="ticket-shell reveal">
                  <div className="ticket" style={{ "--y": "calc(100% - 5.25rem)", flex: 1, display: "flex", flexDirection: "column" } as CSSProperties}>
                    <div className="p-5" style={{ flex: 1 }}>
                      {/* Where: one clear name, the rest muted. */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="t-title truncate text-2xl">{f.city}</h3>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            From {origin.name} · {f.code}{dur ? ` · ${dur}` : ""} · {f.stops === 0 ? "Non-stop" : stops ?? "Round trip"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5 text-[11px] font-semibold">
                          {f.d === cheapestId && results.length > 1 && <span className="rounded-md bg-price px-2 py-1 text-white">Cheapest</span>}
                          {f.d === fastestId && <span className="rounded-md bg-[#e4e9f2] px-2 py-1 text-[#1f2a44]">Fastest</span>}
                        </div>
                      </div>

                      {/* When: three plain columns, no boxes. */}
                      <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm" style={{ gridTemplateColumns: "1.5fr 1fr 1fr" }}>
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">Dates</dt>
                          {open ? (
                            <dd className="mt-0.5 min-w-0">
                              <span className="t-num block truncate font-semibold">{formatRange(f.dep, f.ret)}</span>
                              {!member && <span className="block text-[11px] text-price">Unlocked · {Math.ceil(((unlockedUntil(user, cardKey(origin.slug, f.d, f.nights), now) ?? now) - now) / 86_400_000)} days left</span>}
                            </dd>
                          ) : (
                            <dd className="mt-0.5 flex items-center gap-1.5 font-semibold">
                              <span className="t-num select-none truncate blur-[5px]" aria-hidden>{formatRange(f.dep, f.ret)}</span>
                              <Lock className="shrink-0 text-primary" />
                            </dd>
                          )}
                        </div>
                        <div className="min-w-0"><dt className="text-xs text-muted-foreground">Stay</dt><dd className="mt-0.5"><span className="inline-flex whitespace-nowrap rounded-md bg-secondary px-2 py-0.5 font-semibold text-primary">{f.nights} nights</span></dd></div>
                        <div className="min-w-0"><dt className="text-xs text-muted-foreground">Airline</dt><dd className="mt-0.5 truncate font-semibold">{f.airline || "-"}</dd></div>
                      </dl>

                      {st && st.n >= 4 && <PriceRange masked={!open} price={f.price} min={st.min} avg={st.avg} max={st.max} label={`Fare range for ${f.nights} nights`} />}

                      {(() => {
                        const by = datesByMonth(f);
                        const mos = Object.keys(by).sort();
                        if (mos.length === 0) return null;
                        const key = `${f.d}:${f.nights}`;
                        const shown = mos.includes(cardMonth[key]) ? cardMonth[key] : month && mos.includes(month) ? month : mos.includes(f.month) ? f.month : mos[0];
                        const top = by[shown].slice(0, 3);
                        const avg = st?.avg;
                        return (
                          <div className="mt-4 border-t border-border pt-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">Best dates in {monthLabel(shown)}, {f.nights} nights</p>
                              <div className="flex flex-wrap gap-1" role="tablist" aria-label="Month">
                                {mos.map((mo) => (
                                  <button key={mo} role="tab" aria-selected={mo === shown} onClick={() => setCardMonth((c) => ({ ...c, [key]: mo }))}
                                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${mo === shown ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                                    {monthLabel(mo).split(" ")[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <ol className="mt-2 space-y-1 text-sm" style={{ minHeight: "4.5rem" }}>
                              {top.map((r, k) => {
                                const off = avg && r.price < avg ? Math.round((1 - r.price / avg) * 100) : 0;
                                return (
                                  <li key={r.dep} className="flex items-center justify-between gap-3">
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span className="w-4 text-xs text-muted-foreground">{k + 1}</span>
                                      {open ? (
                                        <span className="t-num truncate font-semibold">{formatRange(r.dep, r.ret)}</span>
                                      ) : (
                                        <span className="t-num select-none truncate font-semibold blur-[5px]" aria-hidden>{formatRange(r.dep, r.ret)}</span>
                                      )}
                                      {r.airline && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{r.airline}</span>}
                                    </span>
                                    <span className="flex shrink-0 items-baseline gap-2">
                                      {off >= 3 && <span className="text-xs font-semibold text-price">{off}% below avg</span>}
                                      <span className="t-num font-semibold">{inrIf(open, r.price)}</span>
                                    </span>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        );
                      })()}

                      <p className="mt-3 text-xs text-muted-foreground">
                        Baggage:{" "}
                        {baggage[f.airline] ? (
                          <a href={baggage[f.airline]} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-primary hover:underline">{f.airline} baggage rules<ArrowUpRight className="ml-1" /></a>
                        ) : (
                          <span>check with {f.airline || "the airline"} before you book</span>
                        )}
                      </p>
                    </div>

                    {/* How much: the same height on every card so the tear lines line up. */}
                    <div className="ticket-perf flex items-center justify-between gap-3 bg-[#fbfbfc] px-5" style={{ height: "5.25rem" }}>
                      <div className="min-w-0">
                        <PriceTag masked={!open} price={f.price} avg={st?.avg} size="lg" />
                      </div>
                      {open ? (
                        <div className="flex shrink-0 gap-2">
                          <a
                            href={fareLink(origin.code, f.code, f.dep, f.ret)}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="font-label flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                          >
                            View fare<ArrowUpRight className="ml-1.5" />
                          </a>
                          <AlertBell on={hasAlert(f.d)} locked={!member} onClick={() => openAlert(f)} />
                        </div>
                      ) : user ? (
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => openUnlock(f)} className="font-label flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                            {left > 0 ? `Unlock dates · ₹${TRIAL_PRICE}` : "Get a plan"}<ArrowRight className="ml-1.5" />
                          </button>
                          <AlertBell on={false} locked onClick={() => openAlert(f)} />
                        </div>
                      ) : (
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => setGateFor(gateCardOf(f))} className="font-label flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                            <Lock className="mr-1.5 h-4 w-4" />Unlock price
                          </button>
                          <AlertBell on={false} locked onClick={() => openAlert(f)} />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          Round-trip fares in rupees{lastSeen ? `, last checked ${formatDay(lastSeen)}` : ""}. Each fare is the lowest we found on the dates we checked for that month and trip length, and &quot;below average&quot; compares it with the same trip length on the same route. Prices change often, so confirm the final fare before you book.
        </p>
      </section>
      {alertFor && <AlertDialog route={alertFor} onClose={() => setAlertFor(null)} onUpgrade={!member && user ? () => { setAlertFor(null); setUnlockFor({ key: "", label: "" }); } : undefined} onGate={!user && alertRow ? () => { setAlertFor(null); setGateFor(gateCardOf(alertRow)); } : undefined} />}
      {gateFor && <GateModal card={gateFor} onClose={() => setGateFor(null)} />}
      {unlockFor && <UnlockDialog target={unlockFor.key ? unlockFor : null} onClose={() => setUnlockFor(null)} />}
    </main>
  );
}

/** The bell on each fare. Solid with ringing marks when an alert is set, a lock when alerts are for members only. */
function AlertBell({ on, locked = false, onClick }: { on: boolean; locked?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={on ? "Edit your price alert" : locked ? "Price alerts, members only" : "Set a price alert"}
      title={on ? "Alert on" : "Set a price alert"}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"}`}
    >
      {on ? <BellOn className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
    </button>
  );
}
