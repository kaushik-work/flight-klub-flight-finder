import type { Metadata } from "next";
import BlogList from "@/components/BlogList";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { kindOf, posts, shortTitle } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog: Cheapest Time to Fly & Flight Fare Guides",
  description: "Fare data guides: the cheapest months to fly from Indian cities and the cheapest flights to popular destinations.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const list = posts.map((p) => ({ id: p.id, title: p.title, short: shortTitle(p), excerpt: p.excerpt, date: p.date, readTime: p.readTime, kind: kindOf(p) }));
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <section className="pb-2 pt-12 sm:pt-16">
          <h1 className="text-6xl font-extrabold tracking-tight sm:text-8xl">Blog<span className="text-primary">.</span></h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            The cheapest months, the cheapest places, and how to read a fare. Written from Flight Klub&apos;s own fare data.
          </p>
        </section>
        <BlogList posts={list} />
      </main>
      <Footer />
    </>
  );
}
