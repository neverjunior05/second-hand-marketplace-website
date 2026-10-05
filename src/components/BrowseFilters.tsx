"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { BOOK_CONDITIONS, CONDITION_META } from "@/lib/conditions";

export type GenreOption = { id: number; name: string; slug: string; listingCount: number };

/** Search + filter bar. All state lives in the URL so results are shareable. */
export function BrowseFilters({ genres }: { genres: GenreOption[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const push = useCallback(
    (updates: Record<string, string | string[] | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        next.delete(key);
        if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
        else if (value !== undefined && value !== "") next.set(key, value);
      }
      router.push(`/?${next.toString()}`);
    },
    [params, router],
  );

  const activeConditions = params.getAll("condition");
  const genre = params.get("genre") ?? "";
  const sort = params.get("sort") ?? "newest";
  const min = params.get("min") ?? "";
  const max = params.get("max") ?? "";

  return (
    <div className="card p-4 sm:p-5">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          push({ q });
        }}
      >
        <input
          className="input"
          placeholder="Search by title, author, ISBN or keyword…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label="Search books"
        />
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary whitespace-nowrap">
            Search
          </button>
          {params.toString() ? (
            <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={() => router.push("/")}>
              Clear
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className="label">Genre</label>
          <select
            className="input"
            value={genre}
            onChange={(event) => push({ genre: event.target.value || undefined })}
          >
            <option value="">All genres</option>
            {genres.map((option) => (
              <option key={option.id} value={option.slug}>
                {option.name} ({option.listingCount})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Price range (₹)</label>
          <div className="flex items-center gap-2">
            <input
              className="input"
              inputMode="numeric"
              placeholder="min"
              value={min}
              onChange={(event) => push({ min: event.target.value || undefined })}
            />
            <span className="text-ink-soft">–</span>
            <input
              className="input"
              inputMode="numeric"
              placeholder="max"
              value={max}
              onChange={(event) => push({ max: event.target.value || undefined })}
            />
          </div>
        </div>

        <div>
          <label className="label">Sort by</label>
          <select className="input" value={sort} onChange={(event) => push({ sort: event.target.value })}>
            <option value="newest">Newest listings</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="condition">Condition: best first</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <span className="label">Condition grade</span>
        <div className="flex flex-wrap gap-2">
          {BOOK_CONDITIONS.map((condition) => {
            const meta = CONDITION_META[condition];
            const active = activeConditions.includes(condition);
            return (
              <button
                key={condition}
                type="button"
                title={meta.definition}
                onClick={() => {
                  const next = active
                    ? activeConditions.filter((c) => c !== condition)
                    : [...activeConditions, condition];
                  push({ condition: next.length ? next : undefined });
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-brand text-white" : `${meta.badgeClass} hover:brightness-95`
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
