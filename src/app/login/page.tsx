import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: true },
};

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/flight-finder";
  return <AuthForm mode="login" next={safe} />;
}

export default function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
