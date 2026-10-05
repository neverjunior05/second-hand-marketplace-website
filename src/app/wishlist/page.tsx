"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConditionBadge } from "@/components/ConditionBadge";
import { useAuth } from "@/context/AppProviders";
import { wishlistService } from "@/services";
import { formatPrice } from "@/lib/format";

type WishlistData = Awaited<ReturnType<typeof wishlistService.list>>;

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<WishlistData | null>(null);

  const load = useCallback(async () => {
    setData(await wishlistService.list());
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (loading) return <p className="py-10 text-center text-ink-soft">Loading…</p>;

  if (!user) {
    return (
      <div className="card p-10 text-center">
        <h1 className="font-display text-2xl">Sign in to see your wishlist</h1>
        <Link href="/login" className="btn btn-primary mt-4">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-3xl">Wishlist</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Books you saved for later. If a copy sells, it stays here marked sold so you know to hunt another.
        </p>
      </header>

      {!data || data.items.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="font-display text-xl">Nothing saved yet</h2>
          <Link href="/" className="btn btn-primary mt-4">
            Browse books
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.items.map((item) => (
            <li key={item.id} className="card flex gap-4 p-4">
              <Link href={`/books/${item.bookId}`} className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-cream">
                {item.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverImage} alt="" className="h-full w-full object-cover" />
                ) : null}
              </Link>
              <div className="flex-1">
                <ConditionBadge condition={item.condition} />
                <Link href={`/books/${item.bookId}`} className="font-display text-lg hover:text-brand">
                  {item.title}
                </Link>
                <p className="text-sm text-ink-soft">
                  {item.author} · {item.genreName}
                </p>
                <p className="mt-1 text-sm">{formatPrice(item.priceCents)}</p>
                {item.status !== "active" ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#0b6b4f]">Sold</p>
                ) : null}
                <button
                  className="btn btn-ghost mt-2"
                  onClick={async () => {
                    await wishlistService.remove(item.bookId);
                    await load();
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
