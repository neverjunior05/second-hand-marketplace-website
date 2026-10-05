import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, cartItems, genres, users } from "@/db/schema";
import { handle, int, readJson } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { shippingForSubtotal } from "@/lib/payments";

/** GET /api/cart — the signed-in user's cart with live prices and totals. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const rows = await db
      .select({
        id: cartItems.id,
        quantity: cartItems.quantity,
        bookId: books.id,
        title: books.title,
        author: books.author,
        priceCents: books.priceCents,
        originalPriceCents: books.originalPriceCents,
        condition: books.condition,
        conditionNotes: books.conditionNotes,
        coverImage: books.coverImage,
        status: books.status,
        available: books.quantity,
        sellerId: books.sellerId,
        sellerName: users.name,
        genreName: genres.name,
      })
      .from(cartItems)
      .innerJoin(books, eq(books.id, cartItems.bookId))
      .innerJoin(users, eq(users.id, books.sellerId))
      .innerJoin(genres, eq(genres.id, books.genreId))
      .where(eq(cartItems.userId, user.id))
      .orderBy(cartItems.id);

    // Flag lines that can no longer be fulfilled (sold in the meantime, etc.)
    const items = rows.map((row) => ({
      ...row,
      blocked: row.status !== "active" || row.available < row.quantity,
      ownListing: row.sellerId === user.id,
    }));

    const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    return {
      items,
      subtotalCents,
      shippingCents: items.length ? shippingForSubtotal(subtotalCents) : 0,
      totalCents: subtotalCents + (items.length ? shippingForSubtotal(subtotalCents) : 0),
    };
  });
}

/** POST /api/cart — add a listing. Own listings and sold copies are rejected. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await readJson(request);
    const bookId = int(body.bookId);
    const quantity = Math.max(1, Math.min(int(body.quantity) ?? 1, 10));
    if (!bookId) throw new HttpError(400, "Missing book.");

    const [book] = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (!book) throw new HttpError(404, "Listing not found.");
    if (book.sellerId === user.id) throw new HttpError(400, "You cannot buy your own listing.");
    if (book.status !== "active") throw new HttpError(409, "This copy has already been sold.");
    if (book.quantity < quantity) throw new HttpError(409, "Not enough copies left.");

    await db
      .insert(cartItems)
      .values({ userId: user.id, bookId, quantity })
      .onConflictDoUpdate({
        target: [cartItems.userId, cartItems.bookId],
        set: { quantity: sql`LEAST(${cartItems.quantity} + ${quantity}, ${book.quantity})` },
      });

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(cartItems)
      .where(eq(cartItems.userId, user.id));

    return { ok: true, cartCount: count };
  });
}

/** DELETE /api/cart — empty the whole cart. */
export async function DELETE() {
  return handle(async () => {
    const user = await requireUser();
    await db.delete(cartItems).where(and(eq(cartItems.userId, user.id)));
    return { ok: true };
  });
}
