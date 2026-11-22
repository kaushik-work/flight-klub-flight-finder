import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import { pickSample } from "@/components/auth/sample";
import Header from "@/components/Header";
import { getRoutes } from "@/lib/flight-fares/store";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: true },
};

async function Form({ searchParams }: { searchParams: Promise<{ next?: string; plan?: string }> }) {
  const { next, plan } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/flight-finder";
  const sample = pickSample(await getRoutes());
  return <AuthForm mode="signup" next={safe} sample={sample} plan={plan} />;
}

export default function Page({ searchParams }: { searchParams: Promise<{ next?: string; plan?: string }> }) {
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
