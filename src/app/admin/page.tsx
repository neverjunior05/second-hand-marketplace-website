"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AppProviders";
import { api, apiError } from "@/services/api";
import { adminService } from "@/services";
import { formatPrice } from "@/lib/format";

type Stats = Awaited<ReturnType<typeof adminService.stats>>;

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [genres, setGenres] = useState<Array<{ id: number; name: string; listingCount: number }>>([]);
  const [newGenre, setNewGenre] = useState({ name: "", description: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminService.stats();
      setStats(data);
      const genreList = await api.get<{ genres: Array<{ id: number; name: string; listingCount: number }> }>(
        "/admin/genres",
      );
      setGenres(genreList.data.genres);
    } catch (err) {
      setError(apiError(err));
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user, load]);

  async function moderate(bookId: number, action: "remove" | "reinstate") {
    try {
      await adminService.moderate(bookId, action);
      setMessage(`Listing #${bookId} ${action}d.`);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function addGenre(event: React.FormEvent) {
    event.preventDefault();
    try {
      await adminService.addGenre(newGenre.name, newGenre.description);
      setNewGenre({ name: "", description: "" });
      setMessage("Genre added.");
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  if (loading) return <p className="py-10 text-center text-ink-soft">Loading…</p>;

  if (user?.role !== "admin") {
    return (
      <div className="card p-10 text-center">
        <h1 className="font-display text-2xl">Admins only</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Sign in as admin@bindery.test / Admin@123 to view moderation tools.
        </p>
        <Link href="/login" className="btn btn-primary mt-4">
          Sign in
        </Link>
      </div>
    );
  }

  const totals = stats?.totals;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl">Admin · trust &amp; safety</h1>
        <p className="mt-1 text-sm text-ink-soft">Moderate listings, watch platform health, manage genres.</p>
      </header>

      {message ? <p className="rounded-xl bg-brand-soft px-4 py-2 text-sm text-brand">{message}</p> : null}
      {error ? <p className="rounded-xl bg-[#F5484B]/10 px-4 py-2 text-sm text-[#F5484B]">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Members", value: totals?.users ?? 0 },
          { label: "Listings", value: totals?.listings ?? 0 },
          { label: "Active listings", value: totals?.activeListings ?? 0 },
          { label: "Completed sales", value: totals?.completedOrders ?? 0 },
          { label: "Sold copies", value: totals?.soldListings ?? 0 },
          { label: "Open orders", value: totals?.openOrders ?? 0 },
          { label: "Removed by mods", value: totals?.removedListings ?? 0 },
          { label: "Seller reviews", value: totals?.reviews ?? 0 },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">{card.label}</p>
            <p className="mt-1 font-display text-2xl">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl">Revenue (delivered orders only)</h2>
        <p className="mt-1 font-display text-3xl text-brand">{formatPrice(totals?.revenueCents ?? 0)}</p>
        <p className="mt-1 text-xs text-ink-soft">
          Counted from the order_items snapshot, so later price edits never rewrite history.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl">Recent listings</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {stats?.recentListings.map((listing) => (
            <li key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream p-3">
              <div>
                <Link href={`/books/${listing.id}`} className="font-medium hover:text-brand">
                  {listing.title}
                </Link>
                <p className="text-xs text-ink-soft">
                  {listing.sellerName} · {formatPrice(listing.priceCents)} · {listing.status}
                  {listing.adminNote ? ` · ${listing.adminNote}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {listing.status !== "removed" ? (
                  <button className="btn btn-ghost text-[#F5484B]" onClick={() => void moderate(listing.id, "remove")}>
                    Remove
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={() => void moderate(listing.id, "reinstate")}>
                    Reinstate
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl">Genres</h2>
        <form onSubmit={addGenre} className="mt-3 flex flex-wrap gap-2">
          <input
            className="input sm:w-56"
            placeholder="Genre name"
            value={newGenre.name}
            onChange={(event) => setNewGenre((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="input flex-1"
            placeholder="Short description"
            value={newGenre.description}
            onChange={(event) => setNewGenre((prev) => ({ ...prev, description: event.target.value }))}
          />
          <button className="btn btn-primary">Add genre</button>
        </form>
        <ul className="mt-4 flex flex-wrap gap-2">
          {genres.map((genre) => (
            <li key={genre.id} className="flex items-center gap-2 rounded-full bg-cream px-3 py-1 text-sm">
              {genre.name}
              <span className="text-xs text-ink-soft">{genre.listingCount}</span>
              <button
                className="text-xs text-[#F5484B]"
                onClick={async () => {
                  try {
                    await adminService.deleteGenre(genre.id);
                    await load();
                  } catch (err) {
                    setError(apiError(err));
                  }
                }}
              >
                ✕
              </button>
            </li>
          ))}
          {genres.length === 0 ? <li className="text-sm text-ink-soft">Genre list unavailable.</li> : null}
        </ul>
      </section>
    </div>
  );
}
