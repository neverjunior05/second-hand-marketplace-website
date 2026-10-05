/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ConditionBadge } from "@/components/ConditionBadge";
import { Rating } from "@/components/Rating";
import type { BookCardDto } from "@/services";
import { discountPercent, formatPrice, relativeTime } from "@/lib/format";

/**
 * Listing card. Condition badge + seller rating are deliberately on the face of
 * the card — buyers should never have to click to learn who they're trusting.
 */
export function BookCard({ book }: { book: BookCardDto }) {
  const discount = discountPercent(book.priceCents, book.originalPriceCents);
  return (
    <article className="card group flex flex-col overflow-hidden transition hover:shadow-[0_10px_30px_-18px_rgba(34,28,21,0.45)]">
      <Link href={`/books/${book.id}`} className="relative block aspect-[2/3] overflow-hidden bg-cream">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col justify-between bg-brand-soft p-4">
            <span className="font-display text-lg text-brand">{book.title}</span>
            <span className="text-xs uppercase tracking-wide text-ink-soft">{book.author}</span>
          </div>
        )}
        {book.status === "sold" ? (
          <span className="absolute left-3 top-3 rounded-full bg-[#10B981] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Sold
          </span>
        ) : (
          <span className="absolute left-3 top-3">
            <ConditionBadge condition={book.condition} />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/books/${book.id}`} className="font-display text-lg leading-snug hover:text-brand">
            {book.title}
          </Link>
          <div className="text-right">
            <p className="font-semibold text-ink">{formatPrice(book.priceCents)}</p>
            {discount ? <p className="text-xs text-ink-soft line-through">{formatPrice(book.originalPriceCents)}</p> : null}
          </div>
        </div>
        <p className="text-sm text-ink-soft">{book.author}</p>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Rating value={book.sellerRating} count={book.sellerReviewCount} />
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <Link href={`/sellers/${book.sellerId}`} className="hover:text-brand">
              {book.sellerName}
              {book.sellerCity ? ` · ${book.sellerCity}` : ""}
            </Link>
            <span>{relativeTime(book.createdAt)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
