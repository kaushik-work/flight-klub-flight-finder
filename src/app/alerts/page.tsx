import type { Metadata } from "next";
import AlertsView, { type RouteFare } from "@/components/alerts/AlertsView";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getRoutes } from "@/lib/flight-fares/store";

export const metadata: Metadata = {
  title: "Price alerts",
  robots: { index: false, follow: false },
};

export default async function AlertsPage() {
  // Today's cheapest fare for every route, so each alert can show how far it is from its target.
  const routes: RouteFare[] = (await getRoutes()).map((r) => ({ o: r.o, d: r.d, city: r.city, code: r.code, price: r.price, avg: r.avg }));
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16 sm:px-8">
        <AlertsView routes={routes} />
      </main>
      <Footer />
    </>
  );
}
