import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import { pickSample } from "@/components/auth/sample";
import Header from "@/components/Header";
import { getRoutes } from "@/lib/flight-fares/store";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: true },
};

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/flight-finder";
  const sample = pickSample(await getRoutes());
  return <AuthForm mode="login" next={safe} sample={sample} />;
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
