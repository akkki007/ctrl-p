import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "../components/nav";
import { ServiceWorkerRegister } from "../components/service-worker";
import { CartProvider } from "../lib/cart";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ctrlp — Poster Printing & Wall of Frames",
    template: "%s · ctrlp",
  },
  description:
    "Upload, customise, and get museum-quality posters printed, framed, and delivered — plus a creator marketplace, the Wall of Frames.",
  applicationName: "ctrlp",
  openGraph: {
    title: "ctrlp — Poster Printing & Wall of Frames",
    description:
      "Museum-quality posters printed, framed, and delivered. Publish your own designs and earn.",
    url: SITE_URL,
    siteName: "ctrlp",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "ctrlp" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <ServiceWorkerRegister />
          <Nav />
          <main className="flex-1 w-full">{children}</main>
          <footer className="border-t border-border py-8 text-center text-sm text-muted">
            ctrlp — printed &amp; framed in-house.
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
