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
    <footer className="mt-12 bg-[#040609] text-sm text-[#f5f5f5]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_2fr]">
        <div>
          <Image src="/flight-klub.svg" alt="Flight Klub" width={160} height={80} className="h-10 w-auto rounded bg-white p-1" />
          <p className="mt-4 max-w-xs text-[#88909c]">
            The cheapest destinations and months to fly from your city, so you can plan around the best fare.
          </p>
          <ul className="mt-5 space-y-2">
            <li><a href={`tel:${PHONE_TEL}`} className={link}>{PHONE_DISPLAY}</a></li>
            <li><a href={`mailto:${EMAIL}`} className={link}>{EMAIL}</a></li>
            <li className="flex gap-4">
              <Link href="/blog" className={link}>Blog</Link>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={link}>WhatsApp</a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={link}>Instagram</a>
            </li>
          </ul>
          <address className="mt-5 max-w-xs text-xs not-italic leading-relaxed text-[#88909c]">
            {ADDRESS}
            <span className="mt-1 block">GSTIN: {GSTIN}</span>
          </address>
        </div>

        {/* Links as compact chips instead of long columns */}
        <div className="space-y-6">
          {[
            ["Flights from", ORIGINS.map((o) => ({ href: `/flight-finder?from=${o.slug}`, text: o.name }))],
            ["International destinations", intl.map((f) => ({ href: `/flight-finder?to=${f.slug}`, text: f.city }))],
            ["Domestic destinations", dom.map((f) => ({ href: `/flight-finder?to=${f.slug}`, text: f.city }))],
          ].map(([title, items]) => (
            <nav key={title as string} aria-label={title as string}>
              <h3 className={head}>{title as string}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {(items as { href: string; text: string }[]).map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} className="inline-block rounded-full border border-white/10 px-3 py-1 text-xs text-[#b6bcc6] transition hover:border-white/40 hover:text-white">{i.text}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-[#88909c]">© 2026 Flight Klub · GSTIN {GSTIN}</p>
      </div>
    </footer>
  );
}
