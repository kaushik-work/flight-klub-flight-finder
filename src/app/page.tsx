import type { Metadata } from "next";
import { ArrowRight, CheckBadge } from "@/components/Icons";
import Link from "next/link";
import DealsGrid from "@/components/home/DealsGrid";
import HeroSearch from "@/components/home/HeroSearch";
import DealTicker, { type TickerDeal } from "@/components/home/DealTicker";
import OfferCards from "@/components/home/OfferCards";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { inr, monthLabel, ORIGINS, savingPct } from "@/lib/fares";
import { getDestinations, getMonthMins, getNightOptions, getRoutes } from "@/lib/flight-fares/store";
import { EMAIL, PHONE_TEL, SITE_DESC, SITE_NAME, SITE_URL, jsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Cheap Flights from India: Cheapest Months & Destinations | Flight Klub" },
  alternates: { canonical: "/" },
};

const h2 = "text-2xl font-extrabold tracking-tight sm:text-3xl";
const eyebrow = "font-label text-xs font-semibold uppercase tracking-widest text-primary";

const steps = [
  ["Pick your city", "See the cheapest destinations and months from where you fly."],
  ["Spot the low", "Fares are compared with each route's own average, so a real low stands out."],
  ["Plan around it", "Unlock the exact dates, set a price alert and book when it drops."],
];

const faqs = [
  ["How does Flight Klub help me find cheaper flights?", "Instead of searching date by date, you see the cheapest destinations and months from your city first. Choosing your dates around the lowest fare is the easiest way to save."],
  ["Are the prices live?", "Prices are indicative round-trip fares from recent searches. They can change, so confirm the final fare before you book."],
  ["Can I search from my city?", "Yes. Choose your departure city in the search bar and every fare updates for that city."],
  ["What does 'below average' mean?", "It compares the cheapest fare with the average of every date we priced for that route, so you can tell a real low from an ordinary fare."],
  ["How much does membership cost?", "There are two plans: ₹399 for 3 months or ₹999 for 12 months. Either one unlocks exact travel dates and price-drop alerts on every fare for as long as it is valid."],
  ["How do I get help planning a trip?", "Tap Details on any fare, or message us on WhatsApp from the header."],
];

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/flight-klub.svg`, email: EMAIL, telephone: PHONE_TEL, address: { "@type": "PostalAddress", streetAddress: "Tejas Arcade, 527/B, Dr Rajkumar Rd, A Block, Milk Colony, 2nd Stage, Rajajinagar", addressLocality: "Bengaluru", addressRegion: "Karnataka", postalCode: "560010", addressCountry: "IN" }, contactPoint: { "@type": "ContactPoint", telephone: PHONE_TEL, email: EMAIL, contactType: "customer support", areaServed: "IN", availableLanguage: ["en", "hi"] } },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESC,
      inLanguage: "en-IN",
      publisher: { "@id": `${SITE_URL}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/flight-finder?from={from}&to={to}` },
        "query-input": ["required name=from", "optional name=to"],
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ],
};

export default async function Home() {
  const [routes, months, nightOptions, destinations] = await Promise.all([getRoutes(), getMonthMins(), getNightOptions(), getDestinations()]);
  const tickerDeals: TickerDeal[] = routes
    .filter((r) => r.intl && r.n >= 5 && savingPct(r) >= 8)
    .sort((a, b) => savingPct(b) - savingPct(a))
    .slice(0, 10)
    .map((r) => ({ o: r.o, from: ORIGINS.find((x) => x.slug === r.o)?.name ?? r.o, d: r.d, city: r.city, price: r.price, pct: savingPct(r) }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(graph)} />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-[#040609] text-white">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="drift absolute -right-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-[#8b1d24]/60 blur-3xl" />
            <div className="drift absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-[#d33a3c]/25 blur-3xl" style={{ animationDelay: "-5s" }} />
            <div className="drift absolute left-1/2 top-10 h-72 w-72 rounded-full bg-[#f59e0b]/15 blur-3xl" style={{ animationDelay: "-9s" }} />
            {[["8%", "22%", "0s"], ["46%", "12%", "1.1s"], ["62%", "70%", "2.2s"], ["90%", "38%", "0.6s"], ["30%", "80%", "1.7s"]].map(([l, t, d], i) => (
              <svg key={i} className="twinkle absolute h-4 w-4 text-[#ffd6a0]" style={{ left: l, top: t, animationDelay: d }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" /></svg>
            ))}
          </div>
          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-16">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
              <div>
                <p className="font-label text-xs font-semibold uppercase tracking-widest text-[#e06b5a]">Flight Klub · Flight Finder</p>
                <h1 className="mt-3 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
                  Cheap flights from India: the <span className="text-[#e06b5a]">cheapest months</span> and destinations
                </h1>
                <p className="mt-4 max-w-lg text-lg text-[#b6bcc6]">
                  Compare round-trip fares from your city, then unlock exact travel dates and price-drop alerts with a membership.
                </p>
                <ul className="font-label mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#b6bcc6]">
                  <li className="flex items-center gap-2"><CheckBadge />Round-trip fares in ₹</li>
                  <li className="flex items-center gap-2"><CheckBadge />8 departure cities</li>
                  <li className="flex items-center gap-2"><CheckBadge />Exact dates and alerts</li>
                </ul>
              </div>
              <OfferCards />
            </div>
            <DealTicker deals={tickerDeals} />
            <div className="mt-8"><HeroSearch nightOptions={nightOptions} destinations={destinations} /></div>
          </div>
        </section>

        {/* Deals and months, in one section */}
        <section id="deals" className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={eyebrow}>Cheapest right now</p>
              <h2 className={`${h2} mt-2`}>Lowest fares from your city</h2>
            </div>
            <Link href="/flight-finder" className="font-label text-sm font-bold text-primary hover:underline">
              Browse all destinations<ArrowRight className="ml-1.5" />
            </Link>
          </div>
          <div className="mt-6"><DealsGrid routes={routes} /></div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="font-label mr-1 text-sm font-semibold text-muted-foreground">Flexible on dates?</span>
            {months.map(({ month: m, from }) => (
              <Link key={m} href={`/flight-finder?month=${m}#fares`} className="rounded-full border border-border bg-white px-4 py-2 text-sm transition hover:border-primary hover:text-primary">
                <span className="font-semibold">{monthLabel(m)}</span> <span className="text-muted-foreground">from {inr(from)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works, kept to one row */}
        <section className="bg-[#040609] py-12 text-white">
          <ol className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3">
            {steps.map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="font-label flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold">{i + 1}</span>
                <div>
                  <h3 className="font-bold text-[#e06b5a]">{t}</h3>
                  <p className="mt-1 text-sm text-[#b6bcc6]">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-14">
          <h2 className={`${h2} text-center`}>Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
            {faqs.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="font-label flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-primary transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Stop searching. Start saving.</h2>
            <p className="mx-auto mt-2 max-w-md text-white/80">Your next trip is cheaper than you think. ₹399 for 3 months or ₹999 for 12 months.</p>
            <Link href="/flight-finder" className="font-label mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-bold text-primary transition hover:opacity-90">
              Become a member · from ₹399<ArrowRight className="ml-1.5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
