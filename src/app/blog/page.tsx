import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Kind, kindOf, posts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog: Cheapest Time to Fly & Flight Fare Guides",
  description: "Fare data guides: the cheapest months to fly from Indian cities and the cheapest flights to popular destinations.",
  alternates: { canonical: "/blog" },
};

const groups: { kind: Kind; title: string; blurb: string }[] = [
  { kind: "guide", title: "Guides", blurb: "How to read fares and find the best price." },
  { kind: "city", title: "Cheapest time to fly, by city", blurb: "The lowest months from each departure city." },
  { kind: "destination", title: "Cheapest flights, by destination", blurb: "What it costs to fly to popular destinations from India." },
];

export default function BlogIndex() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10">
        <section className="pb-4 pt-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Flight Klub blog</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Fare data, cheapest months and destination guides for flying from India.</p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-extrabold">Latest posts</h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link href={`/blog/${p.id}`} className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative h-40 bg-muted">
                    <Image src={p.image} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
                    <span className="font-label absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">New</span>
                  </div>
                  <div className="p-4">
                    <p className="font-label text-xs text-muted-foreground">{p.date} · {p.readTime}</p>
                    <h3 className="mt-1 font-bold leading-snug group-hover:text-primary">{p.title}</h3>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        {groups.map((g) => {
          const items = posts.filter((p) => kindOf(p) === g.kind);
          if (!items.length) return null;
          return (
            <section key={g.kind} className="mt-10">
              <h2 className="text-xl font-extrabold">{g.title}</h2>
              <p className="text-sm text-muted-foreground">{g.blurb}</p>
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <li key={p.id}>
                    <Link href={`/blog/${p.id}`} className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                      <div className="relative h-40 bg-muted">
                        <Image src={p.image} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
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
            </section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
