import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BlogCover from "@/components/BlogCover";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getPost, posts, related } from "@/lib/blog";
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <nav aria-label="Breadcrumb" className="font-label pt-8 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">Home</Link> / <Link href="/blog" className="hover:text-primary">Blog</Link>
        </nav>
        <article>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
          <p className="font-label mt-3 text-sm text-muted-foreground">{post.date} · {post.readTime}</p>
          <div className="mt-6"><BlogCover post={post} large /></div>
          <div className="mt-8 text-[17px] leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: (p) => <h2 className="mb-3 mt-10 text-2xl font-extrabold tracking-tight" {...p} />,
                h3: (p) => <h3 className="mb-2 mt-8 text-xl font-bold" {...p} />,
                p: (p) => <p className="mb-5" {...p} />,
                ul: (p) => <ul className="mb-5 list-disc space-y-1.5 pl-6" {...p} />,
                ol: (p) => <ol className="mb-5 list-decimal space-y-1.5 pl-6" {...p} />,
                a: ({ href = "", ...p }) =>
                  href.startsWith("/") ? (
                    <Link href={href} className="font-semibold text-primary underline-offset-2 hover:underline">{p.children}</Link>
                  ) : (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-2 hover:underline">{p.children}</a>
                  ),
                table: (p) => <div className="mb-6 overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-sm" {...p} /></div>,
                th: (p) => <th className="font-label whitespace-nowrap bg-muted px-4 py-2.5 font-semibold" {...p} />,
                td: (p) => <td className="border-t border-border px-4 py-2.5" {...p} />,
                blockquote: (p) => <blockquote className="mb-5 border-l-4 border-primary bg-secondary/60 px-4 py-3" {...p} />,
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </article>

        <aside className="mt-10 rounded-2xl bg-[#040609] p-6 text-white">
          <p className="text-lg font-extrabold">See today&apos;s cheapest fares</p>
          <p className="mt-1 text-sm text-[#b6bcc6]">Pick your city and find the lowest month to fly.</p>
          <Link href="/flight-finder" className="font-label mt-4 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold hover:opacity-90">Open the Flight Finder →</Link>
        </aside>

        {more.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-extrabold">Keep reading</h2>
            <ul className="mt-4 grid gap-3">
              {more.map((p) => (
                <li key={p.id}><Link href={`/blog/${p.id}`} className="block rounded-xl border border-border bg-card p-4 font-semibold transition hover:border-primary">{p.title}</Link></li>
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
