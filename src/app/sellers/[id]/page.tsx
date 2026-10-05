import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/BookCard";
import { Rating } from "@/components/Rating";
import { formatDate, formatPrice } from "@/lib/format";
import { getPublicSeller, getSellerReviews, getSellerStats, listBooks } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Public seller profile — active listings, rating, verified reviews. */
export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sellerId = Number(id);
  if (!Number.isInteger(sellerId)) notFound();

  const seller = await getPublicSeller(sellerId);
  if (!seller) notFound();

  const [stats, active, sold, reviews] = await Promise.all([
    getSellerStats(sellerId),
    listBooks({ sellerId, status: "active", sort: "newest", limit: 24 }),
    listBooks({ sellerId, status: "sold", sort: "newest", limit: 6 }),
    getSellerReviews(sellerId, 20),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="card paper-grain p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl leading-tight">{seller.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {seller.city ?? "India"} · member since {formatDate(seller.createdAt)}
            </p>
            {seller.bio ? <p className="mt-3 max-w-2xl text-ink-soft">{seller.bio}</p> : null}
          </div>
          <div className="rounded-2xl border border-hairline bg-paper p-4 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Seller rating</p>
            <p className="mt-1 font-display text-3xl text-brand">
              {stats.averageRating ? Number(stats.averageRating).toFixed(1) : "—"}
            </p>
            <Rating value={stats.averageRating} count={stats.reviewCount} showCount={false} />
            <p className="mt-1 text-xs text-ink-soft">from {stats.reviewCount} verified purchase(s)</p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Active listings", value: stats.activeListings },
            { label: "Books sold", value: stats.soldListings },
            { label: "Reviews", value: stats.reviewCount },
            { label: "Cheapest listing", value: active.items.length ? formatPrice(Math.min(...active.items.map((b) => b.priceCents))) : "—" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-hairline bg-paper p-3">
              <dt className="text-xs uppercase tracking-wide text-ink-soft">{item.label}</dt>
              <dd className="font-display text-xl">{item.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section>
        <h2 className="font-display text-2xl">Available from this seller</h2>
        {active.items.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nothing listed right now — check back soon.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {active.items.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl">Reviews from verified buyers</h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No reviews yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {reviews.map((review) => (
              <blockquote key={review.id} className="card p-4">
                <Rating value={review.rating} showCount={false} />
                <p className="mt-2 text-ink-soft">&ldquo;{review.comment}&rdquo;</p>
                <footer className="mt-2 text-xs text-ink-soft">
                  {review.buyerName}
                  {review.buyerCity ? ` · ${review.buyerCity}` : ""} · {formatDate(review.createdAt)}
                </footer>
              </blockquote>
            ))}
          </div>
        )}
      </section>

      {sold.items.length > 0 ? (
        <section>
          <h2 className="font-display text-xl text-ink-soft">Recently sold</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {sold.items.map((book) => (
              <li key={book.id}>
                <Link href={`/books/${book.id}`} className="card flex items-center justify-between p-3 text-sm hover:text-brand">
                  <span>{book.title}</span>
                  <span className="text-ink-soft">{formatPrice(book.priceCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
