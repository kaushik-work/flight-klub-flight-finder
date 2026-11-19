import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });
const label = Space_Grotesk({ variable: "--font-label", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Flight Finder: Cheapest Flights & Months to Fly | Flight Klub",
    template: "%s | Flight Klub",
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    "cheap flights from India",
    "cheapest month to fly",
    "international flight deals",
    "flight finder",
    "round trip fares in rupees",
    "cheap flights from Bangalore",
    "cheap flights from Delhi",
    "cheap flights from Mumbai",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: "/",
    title: "Flight Finder: Cheapest Flights & Months to Fly",
    description: SITE_DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: "Flight Finder: Cheapest Flights & Months to Fly",
    description: SITE_DESC,
  },
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${label.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
