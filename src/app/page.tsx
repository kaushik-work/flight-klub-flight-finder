import type { Metadata } from "next";
import { ArrowRight, Check } from "@/components/Icons";
import Link from "next/link";
import DealsGrid from "@/components/home/DealsGrid";
import ExampleDeals from "@/components/home/ExampleDeals";
import HeroSearch from "@/components/home/HeroSearch";
import SavingsCalc from "@/components/home/SavingsCalc";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LimitBadge from "@/components/LimitBadge";
import { inr, monthLabel } from "@/lib/fares";
import { getDestinations, getMonthMins, getNightOptions, getRoutes } from "@/lib/flight-fares/store";
import { EMAIL, PHONE_TEL, SIGNUP_LIMIT, SITE_DESC, SITE_NAME, SITE_URL, jsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Cheap Flights from India: Cheapest Months & Destinations | Flight Klub" },
  alternates: { canonical: "/" },
};

const h2 = "text-2xl font-extrabold tracking-tight sm:text-3xl";
const eyebrow = "font-label text-xs font-semibold uppercase tracking-widest text-primary";

const steps = [
  ["Track fares", "We watch round-trip fares from your city to destinations around the world."],
  ["Spot the low", "We find the cheapest destinations and the cheapest months, so you know when the price is right."],
  ["Compare in one place", "Sort by price or trip length, filter direct flights, and see dates side by side."],
  ["Plan around the fare", "Pick your dates around the best price and book with confidence."],
];

const perks = [
  ["Cheapest months, at a glance", "See which month is lowest before you plan leave or book hotels."],
  ["Direct flights, one click", "Filter to non-stop flights when your time matters more than the last rupee."],
  ["Every fare in rupees", "Round-trip prices from your city, no currency maths."],
];

const faqs = [
  ["How does Flight Klub help me find cheaper flights?", "Instead of searching date by date, you see the cheapest destinations and months from your city first. Choosing your dates around the lowest fare is the easiest way to save."],
  ["Are the prices live?", "Prices are indicative round-trip fares from recent searches. They can change, so confirm the final fare before you book."],
  ["Can I search from my city?", "Yes. Choose your departure city in the search bar and every fare updates for that city."],
  ["What does 'below average' mean?", "It compares the cheapest fare with the average of every date we priced for that route, so you can tell a real low from an ordinary fare."],
  ["How much does membership cost?", "Membership is ₹399 per year and limited to our first 1,000 founding members. It unlocks exact travel dates and price-drop alerts on every fare."],
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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(graph)} />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#040609] text-white">
          <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#8b1d24]/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-32 h-[24rem] w-[24rem] rounded-full bg-[#d33a3c]/20 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-14 sm:pt-20">
            <LimitBadge dark />
            <p className="font-label mt-5 text-xs font-semibold uppercase tracking-widest text-[#e06b5a]">Flight Klub · Flight Finder</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Fly for less. Know <span className="text-[#e06b5a]">when</span> and <span className="text-[#e06b5a]">where</span> to go.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[#b6bcc6]">
              See the cheapest destinations and months to fly from your city, then plan your trip around the best fare.
            </p>
            <div className="mt-8"><HeroSearch nightOptions={nightOptions} destinations={destinations} /></div>
            <ul className="font-label mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#b6bcc6]">
              <li><Check className="mr-1.5 text-[#e06b5a]" />Round-trip fares in ₹</li>
              <li><Check className="mr-1.5 text-[#e06b5a]" />8 departure cities</li>
              <li><Check className="mr-1.5 text-[#e06b5a]" />Direct-only filter</li>
              <li><Check className="mr-1.5 text-[#e06b5a]" />₹399/year · first {SIGNUP_LIMIT.toLocaleString("en-IN")} members</li>
            </ul>
          </div>
        </section>

        <ExampleDeals routes={routes} />

        {/* Deals */}
        <section id="deals" className="mx-auto max-w-6xl px-4 py-16">
          <p className={eyebrow}>Cheapest right now</p>
          <h2 className={`${h2} mt-2`}>Lowest fares from your city</h2>
          <p className="mt-2 text-muted-foreground">Choose where you are flying from. Tap a card to see the dates.</p>
          <div className="mt-6"><DealsGrid routes={routes} /></div>
          <div className="mt-8 text-center">
            <Link href="/flight-finder" className="font-label inline-block rounded-xl border border-primary px-6 py-3 text-sm font-bold text-primary transition hover:bg-primary hover:text-primary-foreground">
              Browse all destinations<ArrowRight className="ml-1.5" />
            </Link>
          </div>
        </section>

        {/* Months */}
        <section className="bg-secondary/60 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <p className={eyebrow}>Flexible on dates?</p>
            <h2 className={`${h2} mt-2`}>Pick your month, see the best fares</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {months.map(({ month: m, from }) => (
                <div key={m} className="ticket-shell reveal">
                <Link href={`/flight-finder?month=${m}#fares`}
                  className="ticket group block p-5" style={{ "--n": "8px", "--y": "58%" } as React.CSSProperties}>
                  <p className="font-label text-lg font-bold">{monthLabel(m)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">from {inr(from)}</p>
                  <p className="font-label mt-4 text-sm font-bold text-primary transition group-hover:translate-x-1">Explore<ArrowRight className="ml-1.5" /></p>
                </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section className="mx-auto max-w-6xl px-4 py-16"><SavingsCalc routes={routes} /></section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <p className={eyebrow}>How it works</p>
          <h2 className={`${h2} mt-2`}>How Flight Klub finds you the best fare</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([t, d], i) => (
              <li key={t} className="rounded-2xl border border-border bg-card p-6">
                <span className="font-label flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
                <h3 className="mt-4 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Perks */}
        <section className="bg-[#040609] py-16 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className={h2}>Why plan with Flight Klub?</h2>
            <ul className="mt-8 grid gap-5 sm:grid-cols-3">
              {perks.map(([t, d]) => (
                <li key={t} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="font-bold text-[#e06b5a]">{t}</h3>
                  <p className="mt-2 text-sm text-[#b6bcc6]">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-16">
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
            <p className="mx-auto mt-2 max-w-md text-white/80">Your next trip is cheaper than you think. Founding membership is ₹399 a year, limited to 1,000 members.</p>
            <Link href="/flight-finder" className="font-label mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-bold text-primary transition hover:opacity-90">
              Become a member · ₹399/year<ArrowRight className="ml-1.5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
