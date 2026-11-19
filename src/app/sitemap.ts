import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { DESTINATIONS, ORIGINS } from "@/lib/fares";
import { getDestinations, getMonthMins } from "@/lib/flight-fares/store";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [months, live] = await Promise.all([getMonthMins(), getDestinations()]);
  const dests = live.length ? live : DESTINATIONS;
  const u = (path: string, priority: number) => ({ url: `${SITE_URL}${path}`, changeFrequency: "daily" as const, priority });
  return [
    u("/", 1),
    u("/flight-finder", 0.9),
    ...ORIGINS.map((o) => u(`/flight-finder?from=${o.slug}`, 0.8)),
    ...dests.map((d) => u(`/flight-finder?to=${d.slug}`, 0.7)),
    ...months.map((m) => u(`/flight-finder?month=${m.month}`, 0.5)),
    u("/blog", 0.7),
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.id}`, lastModified: p.dateModified, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
