import raw from "@/data/blogPosts.json";

export type Post = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  dateModified: string;
  author: string;
  authorRole: string;
  tags: string[];
  readTime: string;
  metaDescription: string;
  published: boolean;
};

export const posts = (raw as Post[])
  .filter((p) => p.published)
  .sort((a, b) => b.dateModified.localeCompare(a.dateModified));
export const getPost = (id: string) => posts.find((p) => p.id === id);

export type Kind = "city" | "destination" | "guide";
export const kindOf = (p: Post): Kind =>
  p.id.startsWith("cheapest-time-to-fly-from-") ? "city" : p.id.startsWith("cheapest-flights-to-") ? "destination" : "guide";

export const related = (p: Post, n = 3) => {
  const k = kindOf(p);
  return posts.filter((x) => x.id !== p.id && kindOf(x) === k).slice(0, n);
};

const title = (slug: string) =>
  slug === "reunion" ? "Réunion" : slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/** A short headline for tiles, derived from the id (the full title stays on the article page). */
export function shortTitle(p: Pick<Post, "id" | "title">): string {
  const city = /^cheapest-time-to-fly-from-([a-z-]+?)-\d{4}/.exec(p.id);
  if (city) return `Cheapest time to fly from ${title(city[1])}`;
  const dest = /^cheapest-flights-to-([a-z-]+?)-from-india/.exec(p.id);
  if (dest) return `Cheapest flights to ${title(dest[1])}`;
  return p.title.replace(/\s*\(.*$/, "").split(":")[0];
}
