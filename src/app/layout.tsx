import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/context/AppProviders";
import { Navbar } from "@/components/Navbar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bindery — secondhand books from people, not warehouses",
  description:
    "Buy and sell used books directly with other readers. Honest condition grades, verified seller ratings, and single-copy listings that update the moment they sell.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        <AppProviders>
          <Navbar />
          <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">{children}</main>
          <footer className="border-t border-hairline bg-paper">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="font-display text-base text-ink">Bindery</p>
              <p>Secondhand books, first-rate trust. Condition grades and seller ratings on every listing.</p>
            </div>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
