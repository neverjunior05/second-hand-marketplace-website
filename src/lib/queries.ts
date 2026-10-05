/**
 * Server-side query helpers shared by server components and API routes.
 */
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, genres, reviews, users } from "@/db/schema";
import { CONDITION_RANK, type BookCondition } from "@/lib/conditions";

export type BookCard = {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  condition: BookCondition;
  conditionNotes: string;
  description: string;
  priceCents: number;
  originalPriceCents: number | null;
  quantity: number;
  coverImage: string | null;
  coverImage2: string | null;
  status: "active" | "sold" | "removed";
  createdAt: Date;
  soldAt: Date | null;
  genreId: number;
  genreName: string;
  genreSlug: string;
  publishedYear: number | null;
  sellerId: number;
  sellerName: string;
  sellerCity: string | null;
  sellerRating: number | null;
  sellerReviewCount: number;
};

const sellerRatingSubquery = sql<number | null>`(
  SELECT ROUND(AVG(r.rating)::numeric, 1)
  FROM ${reviews} r
  WHERE r.seller_id = ${users.id}
)`;

const sellerReviewCountSubquery = sql<number>`(
  SELECT COUNT(*)::int FROM ${reviews} r WHERE r.seller_id = ${users.id}
)`;

const bookCardColumns = {
  id: books.id,
  title: books.title,
  author: books.author,
  isbn: books.isbn,
  condition: books.condition,
  conditionNotes: books.conditionNotes,
  description: books.description,
  priceCents: books.priceCents,
  originalPriceCents: books.originalPriceCents,
  quantity: books.quantity,
  coverImage: books.coverImage,
  coverImage2: books.coverImage2,
  status: books.status,
  createdAt: books.createdAt,
  soldAt: books.soldAt,
  genreId: books.genreId,
  genreName: genres.name,
  genreSlug: genres.slug,
  publishedYear: books.publishedYear,
  sellerId: books.sellerId,
  sellerName: users.name,
  sellerCity: users.city,
  sellerRating: sellerRatingSubquery,
  sellerReviewCount: sellerReviewCountSubquery,
};

export type BrowseParams = {
  q?: string;
  genre?: string;
  condition?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "condition" | "title";
  sellerId?: number;
  status?: "active" | "sold" | "removed" | "all";
  limit?: number;
  offset?: number;
};

export async function listBooks(params: BrowseParams): Promise<{ items: BookCard[]; total: number }> {
  const filters = [];

  // Default browse = active listings only. Sold copies vanish from search but
  // stay reachable via a direct link / order history (status filter override).
  if (!params.status || params.status === "active") {
    filters.push(eq(books.status, "active"));
  } else if (params.status !== "all") {
    filters.push(eq(books.status, params.status));
  }

  if (params.q) {
    const term = `%${params.q.trim()}%`;
    filters.push(
      or(
        ilike(books.title, term),
        ilike(books.author, term),
        ilike(books.isbn, term),
        ilike(books.description, term),
        ilike(genres.name, term),
      ),
    );
  }
  if (params.genre) filters.push(eq(genres.slug, params.genre));
  if (params.condition && params.condition.length > 0) {
    const valid = params.condition.filter((c) => c in CONDITION_RANK) as BookCondition[];
    if (valid.length > 0) filters.push(inArray(books.condition, valid));
  }
  if (typeof params.minPrice === "number") {
    filters.push(gte(books.priceCents, params.minPrice));
  }
  if (typeof params.maxPrice === "number") {
    filters.push(lte(books.priceCents, params.maxPrice));
  }
  if (typeof params.sellerId === "number") {
    filters.push(eq(books.sellerId, params.sellerId));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  const orderBy = (() => {
    switch (params.sort) {
      case "price_asc":
        return [asc(books.priceCents)];
      case "price_desc":
        return [desc(books.priceCents)];
      case "title":
        return [asc(books.title)];
      case "condition":
        // Best grade first (new → acceptable), then newest.
        return [
          sql`CASE ${books.condition}
            WHEN 'new' THEN 5
            WHEN 'like_new' THEN 4
            WHEN 'good' THEN 3
            WHEN 'fair' THEN 2
            ELSE 1 END DESC`,
          desc(books.createdAt),
        ];
      default:
        return [desc(books.createdAt)];
    }
  })();

  const rows = await db
    .select(bookCardColumns)
    .from(books)
    .innerJoin(users, eq(users.id, books.sellerId))
    .innerJoin(genres, eq(genres.id, books.genreId))
    .where(where)
    .orderBy(...orderBy)
    .limit(params.limit ?? 24)
    .offset(params.offset ?? 0);

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(books)
    .innerJoin(users, eq(users.id, books.sellerId))
    .innerJoin(genres, eq(genres.id, books.genreId))
    .where(where);

  return { items: rows as BookCard[], total: count ?? 0 };
}

export async function getBookCard(id: number): Promise<BookCard | null> {
  const [row] = await db
    .select(bookCardColumns)
    .from(books)
    .innerJoin(users, eq(users.id, books.sellerId))
    .innerJoin(genres, eq(genres.id, books.genreId))
    .where(eq(books.id, id))
    .limit(1);
  return (row as BookCard | undefined) ?? null;
}

export type SellerStats = {
  sellerId: number;
  averageRating: number | null;
  reviewCount: number;
  activeListings: number;
  soldListings: number;
  completedSales: number;
  memberSince: Date;
};

/**
 * ---------------------------------------------------------------------------
 * SELLER RATING AGGREGATION
 * ---------------------------------------------------------------------------
 * A seller's reputation is the simple mean of every review left about them by
 * verified buyers, rounded to one decimal. It is computed in SQL (not cached in
 * the user row) so it can never go stale after a new review lands, and it is
 * attached to every listing via a correlated subquery (see sellerRatingSubquery)
 * so a buyer sees the trust signal before they click through.
 */
export async function getSellerStats(sellerId: number): Promise<SellerStats> {
  const [ratingRow] = await db
    .select({
      averageRating: sql<number | null>`ROUND(AVG(${reviews.rating})::numeric, 1)`,
      reviewCount: sql<number>`COUNT(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.sellerId, sellerId));

  const [activeRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(books)
    .where(and(eq(books.sellerId, sellerId), eq(books.status, "active")));

  const [soldRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(books)
    .where(and(eq(books.sellerId, sellerId), eq(books.status, "sold")));

  const [seller] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, sellerId))
    .limit(1);

  return {
    sellerId,
    averageRating: ratingRow?.averageRating ? Number(ratingRow.averageRating) : null,
    reviewCount: ratingRow?.reviewCount ?? 0,
    activeListings: activeRow?.count ?? 0,
    soldListings: soldRow?.count ?? 0,
    completedSales: soldRow?.count ?? 0,
    memberSince: seller?.createdAt ?? new Date(),
  };
}

export async function getGenres() {
  const rows = await db
    .select({
      id: genres.id,
      name: genres.name,
      slug: genres.slug,
      description: genres.description,
      listingCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${books} b
        WHERE b.genre_id = ${genres.id} AND b.status = 'active'
      )`,
    })
    .from(genres)
    .orderBy(asc(genres.name));
  return rows;
}

export async function getSellerReviews(sellerId: number, limit = 20) {
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      buyerId: reviews.buyerId,
      buyerName: users.name,
      buyerCity: users.city,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.buyerId))
    .where(eq(reviews.sellerId, sellerId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
  return rows;
}

export async function getPublicSeller(sellerId: number) {
  const [seller] = await db
    .select({
      id: users.id,
      name: users.name,
      city: users.city,
      bio: users.bio,
      accent: users.accent,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, sellerId), ne(users.role, "admin")))
    .limit(1);
  return seller ?? null;
}
