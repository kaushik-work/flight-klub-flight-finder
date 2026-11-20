"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import type { Kind, Post } from "@/lib/blog";

export type ListPost = Pick<Post, "id" | "title" | "excerpt" | "date" | "readTime"> & { kind: Kind; short: string };

const TABS: { kind: Kind | "all"; label: string }[] = [
  { kind: "all", label: "All" },
  { kind: "city", label: "By city" },
  { kind: "destination", label: "By destination" },
  { kind: "guide", label: "Guides" },
];

const KIND_LABEL: Record<Kind, string> = { city: "By city", destination: "By destination", guide: "Guide" };
// Tile colours: one family per post type, two shades each, so the grid reads as colourful but meaningful.
type Tone = { bg: string; ink: string };
const TONES: Record<Kind, Tone[]> = {
  city: [{ bg: "from-[#fbd5cf] to-[#f2a39b]", ink: "text-[#3a0d10]" }, { bg: "from-[#8b1d24] to-[#c2453f]", ink: "text-white" }],
  destination: [{ bg: "from-[#d3ecfb] to-[#9ccbf0]", ink: "text-[#0e2a44]" }, { bg: "from-[#fbebc8] to-[#f3cf86]", ink: "text-[#4a3207]" }],
  guide: [{ bg: "from-[#e4d9f7] to-[#c6b2ee]", ink: "text-[#251a4a]" }, { bg: "from-[#e4f3c4] to-[#c6e48b]", ink: "text-[#243808]" }],
};
const DARK: Tone = { bg: "from-[#0b0d12] to-[#34161a]", ink: "text-white" };

// Bento layout, repeating every 8 tiles on a 4-column grid: big, tall, small, small, big, tall, small, small.
const SPAN = [
  "sm:col-span-2 lg:row-span-2", "lg:row-span-2", "", "",
  "sm:col-span-2 lg:row-span-2", "lg:row-span-2", "", "",
];
const SIZE = ["big", "tall", "small", "small", "big", "tall", "small", "small"] as const;
const TITLE_CLASS = { big: "text-3xl sm:text-5xl", tall: "text-2xl sm:text-[1.7rem]", small: "text-xl" };

function Tile({ p, i, tone }: { p: ListPost; i: number; tone: Tone }) {
  const size = SIZE[i % 8];
  return (
    <Link
      href={`/blog/${p.id}`}
      style={{ "--y": "calc(100% - 3.5rem)" } as CSSProperties}
      className={`ticket group flex h-full w-full flex-col bg-gradient-to-br ${tone.bg} ${tone.ink}`}
    >
      <span className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full border-[26px] border-white/20" aria-hidden />
      <span className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full border-[26px] border-white/10" aria-hidden />
      <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-lg text-[#14161c] transition group-hover:rotate-45 group-hover:bg-white" aria-hidden>↗</span>
      <div className="relative flex flex-1 flex-col p-6 sm:p-7">
        <p className="t-label pr-12 !text-[11px]">{KIND_LABEL[p.kind]}</p>
        <h3 className={`t-title mt-4 ${TITLE_CLASS[size]}`}>{p.short}</h3>
        {size === "big" && <p className="mt-4 line-clamp-3 max-w-md text-[15px] leading-relaxed opacity-80">{p.excerpt}</p>}
      </div>
      <div className="ticket-perf relative flex h-14 items-center justify-between px-6 text-xs opacity-80 sm:px-7" style={{ borderColor: "currentColor" }}>
        <span>{p.date} · {p.readTime}</span>
        <span className="font-semibold">Read →</span>
      </div>
    </Link>
  );
}

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
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" aria-label="Post type" className="font-label inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {TABS.filter((t) => t.kind === "all" || counts[t.kind]).map((t) => (
            <button
              key={t.kind}
              role="tab"
              aria-selected={kind === t.kind}
              onClick={() => setKind(t.kind)}
              className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${kind === t.kind ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label} <span className="font-normal text-muted-foreground">{counts[t.kind] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search posts</span>
          <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Dubai, Delhi, month…"
            className="font-label h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-muted p-8 text-xl text-muted-foreground">
          Nothing matches that.{" "}
          <button onClick={() => { setQ(""); setKind("all"); }} className="text-primary underline underline-offset-4">Clear filters</button>
        </p>
      ) : (
        <>
          <ul className="mt-6 grid grid-cols-1 gap-4 [grid-auto-flow:dense] sm:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(14rem,auto)] lg:auto-rows-[15rem]">
            {(() => {
              const seen: Record<string, number> = {};
              return shown.map((p, i) => {
                const n = (seen[p.kind] = (seen[p.kind] ?? -1) + 1);
                const tone = i === 0 ? DARK : TONES[p.kind][n % 2];
                return (
                  <li key={p.id} style={{ "--i": i } as CSSProperties} className={`ticket-shell reveal flex ${SPAN[i % 8]}`}>
                    <Tile p={p} i={i} tone={tone} />
                  </li>
                );
              });
            })()}
          </ul>
        </>
      )}
    </>
  );
}
