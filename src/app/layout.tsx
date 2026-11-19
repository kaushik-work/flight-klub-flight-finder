import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });
const label = Space_Grotesk({ variable: "--font-label", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flight Finder | Cheapest International Fares | Flight Klub",
  description:
    "Find the cheapest destinations and months to fly internationally from India. Indicative round-trip fares, updated regularly.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${label.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
