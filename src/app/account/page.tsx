import type { Metadata } from "next";
import AccountView from "@/components/account/AccountView";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 sm:px-8">
        <AccountView />
      </main>
      <Footer />
    </>
  );
}
