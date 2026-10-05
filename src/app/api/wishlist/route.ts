/** Wishlist / save-for-later. POST toggles. */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { books, genres, users, wishlistItems } from "@/db/schema";
import { handle, int, readJson } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const rows = await db
      .select({
        id: wishlistItems.id,
        bookId: books.id,
        title: books.title,
        author: books.author,
        priceCents: books.priceCents,
        condition: books.condition,
        coverImage: books.coverImage,
        status: books.status,
        genreName: genres.name,
        sellerName: users.name,
      })
      .from(wishlistItems)
      .innerJoin(books, eq(books.id, wishlistItems.bookId))
      .innerJoin(users, eq(users.id, books.sellerId))
      .innerJoin(genres, eq(genres.id, books.genreId))
      .where(eq(wishlistItems.userId, user.id))
      .orderBy(desc(wishlistItems.createdAt));
    return { items: rows };
  });
}

/** POST /api/wishlist — { bookId } toggles the saved state. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await readJson(request);
    const bookId = int(body.bookId);
    if (!bookId) throw new HttpError(400, "Missing book.");

    const [existing] = await db
      .select({ id: wishlistItems.id })
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.bookId, bookId)))
      .limit(1);

    if (existing) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
      return { saved: false };
    }

    await db.insert(wishlistItems).values({ userId: user.id, bookId });
    return { saved: true };
  });
}

/** DELETE /api/wishlist?bookId=1 */
export async function DELETE(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const url = new URL(request.url);
    const bookId = int(url.searchParams.get("bookId"));
    if (!bookId) throw new HttpError(400, "Missing book.");
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.bookId, bookId)));
    return { ok: true };
  });
}
