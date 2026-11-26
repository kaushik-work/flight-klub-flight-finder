import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import { cardFromParams } from "@/lib/gate";
import { pickSample } from "@/components/auth/sample";
import Header from "@/components/Header";
import { getRoutes } from "@/lib/flight-fares/store";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: true },
};

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { next, plan } = sp;
  const gate = cardFromParams(sp);
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/flight-finder";
  const sample = pickSample(await getRoutes());
  return <AuthForm mode="signup" next={safe} sample={sample} plan={plan} gate={gate} />;
}

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
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
