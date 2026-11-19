import { type Post, coverOf } from "@/lib/blog";
import { gradientFor } from "@/lib/fares";

export default function BlogCover({ post, large = false }: { post: Pick<Post, "id" | "title">; large?: boolean }) {
  const c = coverOf(post);
  return (
    <div
      className={`relative flex flex-col justify-end overflow-hidden p-5 text-white ${large ? "aspect-[16/9] rounded-2xl p-8" : "h-40"}`}
      style={{ background: gradientFor(c.slug) }}
      role="img"
      aria-label={`${c.label} ${c.title}`}
    >
      <p className={`font-label uppercase tracking-widest opacity-80 ${large ? "text-sm" : "text-[11px]"}`}>{c.label}</p>
      <p className={`mt-1 font-extrabold leading-tight tracking-tight ${large ? "text-5xl sm:text-6xl" : "text-2xl"}`}>{c.title}</p>
      <p className={`font-label absolute right-4 top-4 rounded-full bg-black/35 px-3 py-1 font-semibold ${large ? "text-xs" : "text-[11px]"}`}>Flight Klub</p>
    </div>
  );
}
