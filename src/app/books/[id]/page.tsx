import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton, SaveForLaterButton } from "@/components/BookActions";
import { BookImage } from "@/components/BookImage";
import { ConditionBadge } from "@/components/ConditionBadge";
import { Rating } from "@/components/Rating";
import { CONDITION_META } from "@/lib/conditions";
import { discountPercent, formatDate, formatPrice, relativeTime } from "@/lib/format";
import { getBookCard, getSellerReviews, getSellerStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) notFound();

  const book = await getBookCard(bookId);
  if (!book) notFound();

  const [stats, reviews] = await Promise.all([
    getSellerStats(book.sellerId),
    getSellerReviews(book.sellerId, 4),
  ]);
  const meta = CONDITION_META[book.condition];
  const discount = discountPercent(book.priceCents, book.originalPriceCents);

  return (
    <div className="flex flex-col gap-8">
      <nav className="text-sm text-ink-soft">
        <Link href="/" className="hover:text-brand">
          Browse
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/?genre=${book.genreSlug}`} className="hover:text-brand">
          {book.genreName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{book.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="flex flex-col gap-4">
          <div className="card overflow-hidden">
            <div className="aspect-[2/3] bg-cream">
              <BookImage src={book.coverImage} title={book.title} author={book.author} />
            </div>
          </div>
          {book.coverImage2 ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="card aspect-[2/3] overflow-hidden">
                <BookImage src={book.coverImage2} title={`${book.title} condition photo`} />
              </div>
              <div className="card flex aspect-[2/3] flex-col justify-center gap-2 bg-cream p-4">
                <p className="font-display text-base">Second photo</p>
                <p className="text-xs text-ink-soft">
                  Sellers are encouraged to photograph the actual flaws listed below — spine, margins, highlights.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <header>
            <div className="flex flex-wrap items-center gap-3">
              <ConditionBadge condition={book.condition} size="md" withMeaning />
              {book.status === "sold" ? (
                <span className="rounded-full bg-[#10B981]/15 px-3 py-1 text-sm font-bold text-[#0b6b4f] ring-1 ring-[#10B981]/40">
                  Sold {book.soldAt ? relativeTime(book.soldAt) : ""}
                </span>
              ) : null}
              <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">{book.genreName}</span>
            </div>
            <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">{book.title}</h1>
            <p className="mt-1 text-lg text-ink-soft">by {book.author}</p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <span className="text-3xl font-semibold text-ink">{formatPrice(book.priceCents)}</span>
              {discount ? (
                <>
                  <span className="text-lg text-ink-soft line-through">
                    {formatPrice(book.originalPriceCents)}
                  </span>
                  <span className="rounded-full bg-clay-soft px-3 py-1 text-sm font-semibold text-clay">
                    {discount}% off retail
                  </span>
                </>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Listed {relativeTime(book.createdAt)} · ISBN {book.isbn ?? "not provided"} ·{" "}
              {book.quantity > 0 ? `${book.quantity} cop${book.quantity === 1 ? "y" : "ies"} available` : "0 copies left"}
              {book.publishedYear ? ` · ${book.publishedYear} edition` : ""}
            </p>
          </header>

          {/* The single most important trust block on the page. */}
          <section className="card border-l-4 border-l-brand p-5">
            <h2 className="font-display text-xl">Condition: {meta.label}</h2>
            <p className="mt-2 text-sm text-ink-soft">{meta.definition}</p>
            <div className="mt-4 rounded-xl bg-cream p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">
                What this seller says is wrong with this copy
              </p>
              <p className="mt-2 text-ink">{book.conditionNotes}</p>
              <p className="mt-3 text-xs text-ink-soft">Typical for this grade: {meta.typicalFlaws}</p>
            </div>
          </section>

          <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:w-56">
              <AddToCartButton bookId={book.id} disabled={book.status !== "active"} quantity={book.quantity} />
            </div>
            <div className="sm:w-56">
              <SaveForLaterButton bookId={book.id} />
            </div>
          </section>

          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Rating value={stats.averageRating} count={stats.reviewCount} size="md" />
                <div>
                  <Link href={`/sellers/${book.sellerId}`} className="font-display text-lg hover:text-brand">
                    {book.sellerName}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {book.sellerCity ?? "India"} · member since {formatDate(stats.memberSince)} ·{" "}
                    {stats.soldListings} sold
                  </p>
                </div>
              </div>
              <Link href={`/sellers/${book.sellerId}`} className="btn btn-ghost">
                View seller profile
              </Link>
            </div>
            {reviews.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {reviews.slice(0, 2).map((review) => (
                  <blockquote key={review.id} className="rounded-xl bg-cream p-3 text-sm">
                    <Rating value={review.rating} showCount={false} />
                    <p className="mt-1 text-ink-soft">&ldquo;{review.comment}&rdquo;</p>
                    <footer className="mt-1 text-xs text-ink-soft">— {review.buyerName}</footer>
                  </blockquote>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-soft">
                This seller has no verified reviews yet. Read the condition notes carefully and ask before buying.
              </p>
            )}
          </section>

          <section>
            <h2 className="font-display text-xl">About this copy</h2>
            <p className="mt-2 whitespace-pre-line text-ink-soft">{book.description}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
