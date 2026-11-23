import type { Metadata } from "next";
import { Suspense } from "react";
import FlightFinder from "@/components/FlightFinder";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { DEFAULT_ORIGIN, DESTINATIONS, type Row, findOrigin, resolveDest } from "@/lib/fares";
import { getBaggageLinks, getOriginRows } from "@/lib/flight-fares/store";
import { SITE_URL, jsonLd } from "@/lib/site";

type SP = Promise<{ from?: string; to?: string; nights?: string; month?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { from, to } = await searchParams;
  const origin = findOrigin(from) ?? DEFAULT_ORIGIN;
  const dest = DESTINATIONS.find((x) => x.slug === to?.toLowerCase());
  const title = dest
    ? `Cheap Flights from ${origin.name} to ${dest.city}: Best Fares & Months`
    : `Cheap ${from ? "" : "International "}Flights from ${origin.name}: Cheapest Destinations & Months`;
  const description = dest
    ? `Round-trip flights from ${origin.name} to ${dest.city}. See the cheapest month to fly, trip lengths and direct options.`
    : `Compare round-trip fares from ${origin.name}. Find the cheapest destinations and months, filter direct flights and plan around the best price.`;
  const qs = new URLSearchParams();
  if (from) qs.set("from", origin.slug);
  if (dest) qs.set("to", dest.slug);
  const canonical = `/flight-finder${qs.size ? `?${qs}` : ""}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical }, twitter: { title, description } };
}

async function FinderContent({ searchParams }: { searchParams: SP }) {
  const { from, to, nights, month } = await searchParams;
  const origin = findOrigin(from) ?? DEFAULT_ORIGIN;
  const [rows, baggage] = await Promise.all([getOriginRows(origin.slug), getBaggageLinks()]);
  const dest = resolveDest(to, rows);
  const n = [3, 5, 7].includes(Number(nights)) ? Number(nights) : null;
  const m = month && rows.some((r) => r.month === month) ? month : null;

  const best = new Map<string, Row>();
  for (const r of rows) if (r.intl && (!best.get(r.d) || r.price < best.get(r.d)!.price)) best.set(r.d, r);
  const list = [...best.values()].sort((a, b) => a.price - b.price);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Flight Finder", item: `${SITE_URL}/flight-finder` },
        ],
      },
      ...(list.length
        ? [{
            "@type": "ItemList",
            name: `Cheapest international flights from ${origin.name}`,
            itemListElement: list.map((f, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Product",
                name: `Flights from ${origin.name} to ${f.city}`,
                offers: { "@type": "Offer", priceCurrency: "INR", price: f.price, availability: "https://schema.org/InStock" },
              },
            })),
          }]
        : []),
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <FlightFinder key={`${origin.slug}-${dest}-${n}-${m}`} origin={origin} rows={rows} baggage={baggage} initialDest={dest} initialNights={n} initialMonth={m} fromExplicit={!!findOrigin(from)} />
    </>
  );
}

export default function FlightFinderPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="min-h-[60vh] flex-1" />}>
        <FinderContent searchParams={searchParams} />
      </Suspense>
      <Footer />
    </>
  );
}
