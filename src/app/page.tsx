import Link from "next/link";
import { BookCard } from "@/components/BookCard";
import { BrowseFilters } from "@/components/BrowseFilters";
import { CONDITION_META, BOOK_CONDITIONS } from "@/lib/conditions";
import { getGenres, listBooks } from "@/lib/queries";
import { int } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = one(params.q);
  const genre = one(params.genre);
  const sort = (one(params.sort) ?? "newest") as "newest" | "price_asc" | "price_desc" | "condition" | "title";
  const conditions = Array.isArray(params.condition) ? params.condition : params.condition ? [params.condition] : [];
  const min = int(one(params.min));
  const max = int(one(params.max));
  const page = Math.max(1, int(one(params.page)) ?? 1);
  const perPage = 12;

  const [genres, result] = await Promise.all([
    getGenres(),
    listBooks({
      q,
      genre,
      condition: conditions,
      minPrice: min !== null ? min * 100 : undefined,
      maxPrice: max !== null ? max * 100 : undefined,
      sort,
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
  ]);

  const cheapest = [...result.items].sort((a, b) => a.priceCents - b.priceCents)[0];

  return (
    <div className="flex flex-col gap-6">
      <section className="paper-grain card overflow-hidden p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">
          secondhand books · single copies · honest grades
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl leading-tight sm:text-5xl">
          Buy a used book from a person, not a warehouse.
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Every listing carries a fixed condition grade, a written description of the actual flaws, and the
          seller&apos;s rating from verified buyers. One copy each — when it sells, it&apos;s gone.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/sell" className="btn btn-secondary">
            List a book for sale
          </Link>
          <Link href="#results" className="btn btn-ghost">
            {result.total} book{result.total === 1 ? "" : "s"} available
          </Link>
          {cheapest ? (
            <span className="btn btn-ghost cursor-default">
              Cheapest right now: {formatPrice(cheapest.priceCents)}
            </span>
          ) : null}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl">How condition grading works</h2>
        <p className="mt-1 text-sm text-ink-soft">
          The grade is a fixed scale, not free text — so &quot;Good&quot; means the same thing from every seller. The
          seller then describes the specific flaws next to it.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {BOOK_CONDITIONS.map((condition) => {
            const meta = CONDITION_META[condition];
            return (
              <div key={condition} className="rounded-xl border border-hairline bg-cream p-3">
                <p className="font-display text-base">{meta.label}</p>
                <p className="mt-1 text-xs text-ink-soft">{meta.definition}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div id="results">
        <BrowseFilters
          genres={genres.map((g) => ({ id: g.id, name: g.name, slug: g.slug, listingCount: g.listingCount }))}
        />
      </div>

      {q ? (
        <p className="text-sm text-ink-soft">
          {result.total} result{result.total === 1 ? "" : "s"} for <strong className="text-ink">&ldquo;{q}&rdquo;</strong>
        </p>
      ) : null}

      {result.items.length === 0 ? (
        <div className="card p-10 text-center">
          <h3 className="font-display text-xl">No listings match those filters</h3>
          <p className="mt-2 text-sm text-ink-soft">
            Try widening the price range or clearing a condition grade. Sold copies leave search automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {result.total > perPage ? (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: Math.ceil(result.total / perPage) }).map((_, index) => {
            const target = new URLSearchParams();
            if (q) target.set("q", q);
            if (genre) target.set("genre", genre);
            target.set("sort", sort);
            target.set("page", String(index + 1));
            return (
              <Link
                key={index}
                href={`/?${target.toString()}`}
                className={`rounded-full px-3 py-1 text-sm ${
                  page === index + 1 ? "bg-brand text-white" : "border border-hairline bg-paper"
                }`}
              >
                {index + 1}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
