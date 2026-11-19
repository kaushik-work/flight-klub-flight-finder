"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BlogCover from "@/components/BlogCover";
import type { Kind, Post } from "@/lib/blog";

export type ListPost = Pick<Post, "id" | "title" | "excerpt" | "date" | "readTime"> & { kind: Kind };

const TABS: { kind: Kind | "all"; label: string }[] = [
  { kind: "all", label: "All" },
  { kind: "city", label: "By city" },
  { kind: "destination", label: "By destination" },
  { kind: "guide", label: "Guides" },
];

export default function BlogList({ posts }: { posts: ListPost[] }) {
  const [kind, setKind] = useState<Kind | "all">("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: posts.length };
    for (const p of posts) c[p.kind] = (c[p.kind] ?? 0) + 1;
    return c;
  }, [posts]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return posts.filter((p) => (kind === "all" || p.kind === kind) && (!s || `${p.title} ${p.excerpt}`.toLowerCase().includes(s)));
  }, [posts, kind, q]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Post type" className="flex flex-wrap gap-2">
          {TABS.filter((t) => t.kind === "all" || counts[t.kind]).map((t) => (
            <button
              key={t.kind}
              role="tab"
              aria-selected={kind === t.kind}
              onClick={() => setKind(t.kind)}
              className={`font-label rounded-full border px-4 py-2 text-sm font-semibold transition ${kind === t.kind ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}
            >
              {t.label} <span className="opacity-70">({counts[t.kind] ?? 0})</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Dubai, Delhi, cheapest month…"
            aria-label="Search posts"
            className="font-label h-11 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {shown.length} post{shown.length === 1 ? "" : "s"}
        {(q || kind !== "all") && (
          <button onClick={() => { setQ(""); setKind("all"); }} className="font-label ml-3 font-semibold text-primary hover:underline">Clear filters</button>
        )}
      </p>

      {shown.length === 0 ? (
        <p className="mt-4 rounded-xl bg-muted p-6 text-muted-foreground">No posts match. Try another word or clear the filters.</p>
      ) : (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => (
            <li key={p.id}>
              <Link href={`/blog/${p.id}`} className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative">
                  <BlogCover post={p} />
                  {i < 3 && kind === "all" && !q && (
                    <span className="font-label absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-primary">New</span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-label text-xs text-muted-foreground">{p.date} · {p.readTime}</p>
                  <h3 className="mt-1 font-bold leading-snug group-hover:text-primary">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
