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
