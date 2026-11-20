import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getPost, kindOf, posts, related } from "@/lib/blog";
import { SITE_NAME, SITE_URL, jsonLd } from "@/lib/site";

export function generateStaticParams() {
  return posts.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const post = getPost((await params).id);
  if (!post) return {};
  return {
    title: post.title,
    description: post.metaDescription,
    alternates: { canonical: `/blog/${post.id}` },
    keywords: post.tags,
    openGraph: { type: "article", title: post.title, description: post.metaDescription, url: `/blog/${post.id}`, modifiedTime: post.dateModified },
    twitter: { title: post.title, description: post.metaDescription },
  };
}

async function PostBody({ params }: { params: Promise<{ id: string }> }) {
  const post = getPost((await params).id);
  if (!post) notFound();

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.dateModified,
    dateModified: post.dateModified,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/flight-klub.svg` } },
    mainEntityOfPage: `${SITE_URL}/blog/${post.id}`,
  };
  const more = related(post);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <Header />
      <main className="mx-auto w-full max-w-[46rem] flex-1 px-4 pb-16">
        <nav aria-label="Breadcrumb" className="font-label pt-8 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">Home</Link> / <Link href="/blog" className="hover:text-primary">Blog</Link>
        </nav>
        <article>
          <header className="mt-6 rounded-3xl bg-[#f6e3df] px-6 py-10 sm:px-12 sm:py-14">
            <span className="font-label inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">{{ city: "By city", destination: "By destination", guide: "Guide" }[kindOf(post)]}</span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.06] tracking-tight text-[#2a0f12] sm:text-6xl">{post.title}</h1>
            <p className="font-label mt-5 text-sm text-[#2a0f12]/65">{post.date} · {post.readTime}</p>
          </header>
          <div className="mt-12 text-[1.1rem] leading-8 text-[#1c2230]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: (p) => <h2 className="mb-4 mt-14 text-[2rem] font-bold leading-tight tracking-tight" {...p} />,
                h3: (p) => <h3 className="mb-2 mt-9 text-2xl font-bold tracking-tight" {...p} />,
                p: (p) => <p className="mb-5" {...p} />,
                ul: (p) => <ul className="mb-6 list-disc space-y-2 pl-6 marker:text-primary" {...p} />,
                ol: (p) => <ol className="mb-6 list-decimal space-y-2 pl-6 marker:text-primary" {...p} />,
                a: ({ href = "", ...p }) =>
                  href.startsWith("/") ? (
                    <Link href={href} className="text-primary underline decoration-primary/30 underline-offset-4 transition hover:decoration-primary">{p.children}</Link>
                  ) : (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 transition hover:decoration-primary">{p.children}</a>
                  ),
                table: (p) => <div className="font-label my-8 overflow-x-auto"><table className="w-full border-collapse text-left text-[15px] leading-normal" {...p} /></div>,
                th: (p) => <th className="whitespace-nowrap bg-[#f6e3df] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6b141a] first:rounded-tl-xl last:rounded-tr-xl" {...p} />,
                td: (p) => <td className="border-b border-border px-4 py-3" {...p} />,
                blockquote: (p) => <blockquote className="my-8 rounded-2xl border-l-4 border-primary bg-[#fbf0ee] px-6 py-5 text-xl font-semibold leading-snug text-[#2a0f12]" {...p} />,
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </article>

        <aside className="mt-16 rounded-3xl bg-[#8b1d24] px-7 py-10 text-white sm:px-12">
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">See today&apos;s cheapest fares.</p>
          <p className="mt-2 text-white/75">Pick your city and find the lowest month to fly.</p>
          <Link href="/flight-finder" className="font-label mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-[#f6e3df]">Open the Flight Finder →</Link>
        </aside>

        {more.length > 0 && (
          <section className="mt-14">
            <h2 className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-primary">Keep reading</h2>
            <ul className="mt-4 grid gap-3">
              {more.map((p) => (
                <li key={p.id}>
                  <Link href={`/blog/${p.id}`} className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5 text-xl font-bold leading-snug tracking-tight shadow-sm transition hover:border-primary/40 hover:text-primary hover:shadow-md">
                    {p.title}
                    <span className="font-label flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-base transition group-hover:border-primary group-hover:bg-primary group-hover:text-white" aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<><Header /><main className="min-h-[70vh] flex-1" /></>}>
      <PostBody params={params} />
    </Suspense>
  );
}
