import type { Metadata } from "next";
import BlogList from "@/components/BlogList";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { kindOf, posts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog: Cheapest Time to Fly & Flight Fare Guides",
  description: "Fare data guides: the cheapest months to fly from Indian cities and the cheapest flights to popular destinations.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const list = posts.map((p) => ({ id: p.id, title: p.title, excerpt: p.excerpt, date: p.date, readTime: p.readTime, kind: kindOf(p) }));
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10">
        <section className="pb-6 pt-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Flight Klub blog</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Fare data, cheapest months and destination guides for flying from India.</p>
        </section>
        <BlogList posts={list} />
      </main>
      <Footer />
    </>
  );
}
