"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConditionBadge, StatusBadge } from "@/components/ConditionBadge";
import { useAuth } from "@/context/AppProviders";
import { apiError } from "@/services/api";
import { booksService, type BookCardDto } from "@/services";
import { BOOK_CONDITIONS, CONDITION_META } from "@/lib/conditions";
import { formatPrice, relativeTime } from "@/lib/format";

/** "My Listings": edit price/condition, mark sold, re-list, or remove. */
export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const [books, setBooks] = useState<BookCardDto[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await booksService.browse({ sellerId: user.id, status: "all", limit: 60 });
    setBooks(data.books);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: number, payload: Record<string, unknown>, note: string) {
    setBusyId(id);
    setError(null);
    try {
      await booksService.update(id, payload);
      setMessage(note);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    setBusyId(id);
    try {
      await booksService.remove(id);
      setMessage("Listing removed. Order history keeps its snapshot.");
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="py-10 text-center text-ink-soft">Loading your listings…</p>;

  if (!user) {
    return (
      <div className="card p-10 text-center">
        <h1 className="font-display text-2xl">Sign in to manage your listings</h1>
        <Link href="/login" className="btn btn-primary mt-4">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">My listings</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {books.filter((b) => b.status === "active").length} active ·{" "}
            {books.filter((b) => b.status === "sold").length} sold automatically on purchase
          </p>
        </div>
        <Link href="/sell" className="btn btn-primary">
          + List another book
        </Link>
      </header>

      {message ? <p className="rounded-xl bg-brand-soft px-4 py-2 text-sm text-brand">{message}</p> : null}
      {error ? <p className="rounded-xl bg-[#F5484B]/10 px-4 py-2 text-sm text-[#F5484B]">{error}</p> : null}

      {books.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="font-display text-xl">Nothing listed yet</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Start with the ISBN on the back cover — the rest of the form fills itself.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {books.map((book) => (
            <li key={book.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-cream">
                {book.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverImage} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ConditionBadge condition={book.condition} />
                  <StatusBadge status={book.status} />
                  <span className="text-xs text-ink-soft">listed {relativeTime(book.createdAt)}</span>
                </div>
                <Link href={`/books/${book.id}`} className="font-display text-lg hover:text-brand">
                  {book.title}
                </Link>
                <p className="text-sm text-ink-soft">
                  {book.author} · {formatPrice(book.priceCents)} · qty {book.quantity}
                </p>
                <p className="mt-1 text-xs text-ink-soft">Flaws: {book.conditionNotes}</p>
              </div>

              <div className="grid gap-2 sm:w-64">
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor={`price-${book.id}`}>
                    Price
                  </label>
                  <input
                    id={`price-${book.id}`}
                    className="input"
                    defaultValue={(book.priceCents / 100).toString()}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value && Math.round(Number(value) * 100) !== book.priceCents) {
                        void patch(book.id, { price: value }, "Price updated.");
                      }
                    }}
                  />
                  <label className="sr-only" htmlFor={`condition-${book.id}`}>
                    Condition
                  </label>
                  <select
                    id={`condition-${book.id}`}
                    className="input"
                    defaultValue={book.condition}
                    onChange={(event) =>
                      void patch(
                        book.id,
                        { condition: event.target.value },
                        `Condition set to ${CONDITION_META[event.target.value as (typeof BOOK_CONDITIONS)[number]].label}.`,
                      )
                    }
                  >
                    {BOOK_CONDITIONS.map((condition) => (
                      <option key={condition} value={condition}>
                        {CONDITION_META[condition].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/listings/${book.id}/edit`} className="btn btn-ghost">
                    Edit
                  </Link>
                  {book.status === "active" ? (
                    <button
                      className="btn btn-ghost"
                      disabled={busyId === book.id}
                      onClick={() => void patch(book.id, { status: "sold" }, "Marked as sold.")}
                    >
                      Mark sold
                    </button>
                  ) : book.status !== "removed" ? (
                    <button
                      className="btn btn-ghost"
                      disabled={busyId === book.id}
                      onClick={() => void patch(book.id, { status: "active" }, "Re-listed.")}
                    >
                      Re-list
                    </button>
                  ) : null}
                  <button
                    className="btn btn-ghost text-[#F5484B]"
                    disabled={busyId === book.id}
                    onClick={() => void remove(book.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
