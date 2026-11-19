import Image from "next/image";
import Link from "next/link";
import { DESTINATIONS, ORIGINS } from "@/lib/fares";
import { getDestinations } from "@/lib/flight-fares/store";
import { ADDRESS, EMAIL, GSTIN, INSTAGRAM_URL, PHONE_DISPLAY, PHONE_TEL, WHATSAPP_URL } from "@/lib/site";

const head = "font-label text-xs font-semibold uppercase tracking-wider text-white";
const link = "text-[#88909c] transition hover:text-white";

export default async function Footer() {
  const live = await getDestinations();
  const all = live.length ? live : DESTINATIONS;
  const intl = all.filter((f) => f.intl);
  const dom = all.filter((f) => !f.intl);
  return (
    <footer className="mt-16 bg-[#040609] text-sm text-[#f5f5f5]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image src="/flight-klub.svg" alt="Flight Klub" width={160} height={80} className="h-10 w-auto rounded bg-white p-1" />
          <p className="mt-4 max-w-xs text-[#88909c]">
            Planning a trip? Flight Klub shows you the cheapest destinations and the cheapest months to fly from your
            city, so you can pick your dates around the best fare and save on every flight.
          </p>
          <ul className="mt-5 space-y-2">
            <li><a href={`tel:${PHONE_TEL}`} className={link}>{PHONE_DISPLAY}</a></li>
            <li><a href={`mailto:${EMAIL}`} className={link}>{EMAIL}</a></li>
            <li><Link href="/blog" className={link}>Blog</Link></li>
            <li><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={link}>Chat on WhatsApp</a></li>
            <li><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={link}>Instagram</a></li>
          </ul>
          <address className="mt-5 max-w-xs not-italic text-[#88909c]">
            <span className="font-label block text-xs font-semibold uppercase tracking-wider text-white">Office</span>
            <span className="mt-2 block">{ADDRESS}</span>
            <span className="mt-2 block">GSTIN: {GSTIN}</span>
          </address>
        </div>

        <nav aria-label="Flights by city">
          <h3 className={head}>Flights from</h3>
          <ul className="mt-4 space-y-2">
            {ORIGINS.map((o) => (
              <li key={o.slug}>
                <Link href={`/flight-finder?from=${o.slug}`} className={link}>
                  Flights from {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="International destinations">
          <h3 className={head}>International destinations</h3>
          <ul className="mt-4 space-y-2">
            {intl.map((f) => (
              <li key={f.slug}>
                <Link href={`/flight-finder?to=${f.slug}`} className={link}>
                  Flights to {f.city}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Domestic destinations">
          <h3 className={head}>Domestic destinations</h3>
          <ul className="mt-4 space-y-2">
            {dom.map((f) => (
              <li key={f.slug}>
                <Link href={`/flight-finder?to=${f.slug}`} className={link}>
                  Flights to {f.city}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-[#88909c]">© 2026 Flight Klub · GSTIN {GSTIN}</p>
      </div>
    </footer>
  );
}
