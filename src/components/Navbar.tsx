"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, useCart } from "@/context/AppProviders";

const links = [
  { href: "/", label: "Browse" },
  { href: "/sell", label: "Sell a book" },
  { href: "/listings", label: "My listings" },
  { href: "/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
];

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const { count } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const navLinks = user?.role === "admin" ? [...links, { href: "/admin", label: "Admin" }] : links;

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold text-brand">Bindery</span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-ink-soft sm:inline">
            used books
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-cream hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/cart" className="btn btn-ghost relative">
            Cart
            {count > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            ) : null}
          </Link>
          {loading ? (
            <span className="text-sm text-ink-soft">…</span>
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link href="/listings" className="hidden text-sm font-medium text-ink sm:inline">
                {user.name.split(" ")[0]}
                {user.role === "admin" ? <span className="ml-1 text-[10px] uppercase text-clay">admin</span> : null}
              </Link>
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  await logout();
                  router.push("/");
                  router.refresh();
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Join
              </Link>
            </>
          )}
          <button
            className="btn btn-ghost lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
        </div>
      </div>

      {open ? (
        <nav className="grid gap-1 border-t border-hairline bg-paper px-4 py-3 lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-cream"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
