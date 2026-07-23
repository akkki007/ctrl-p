import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "../components/nav";
import { CartProvider } from "../lib/cart";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ctrlp — Poster Printing",
  description:
    "Upload, customise, and get museum-quality posters printed, framed, and delivered.",
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
