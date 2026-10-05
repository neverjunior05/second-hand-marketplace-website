/** Admin: platform-wide stats, listing moderation, genre management. */
import { desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, genres, orderItems, orders, reviews, users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/api";
import { HttpError, requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/stats
 * Revenue counts delivered orders only — money actually settled, gross of the
 * shipping pass-through, and summed from the order_items snapshot.
 */
export async function GET() {
  return handle(async () => {
    await requireAdmin();

    const [[userCount], [bookCount], [statusRow], [reviewCount], [salesRow], [openRow]] =
      await Promise.all([
        db.select({ value: sql<number>`COUNT(*)::int` }).from(users),
        db.select({ value: sql<number>`COUNT(*)::int` }).from(books),
        db
          .select({
            active: sql<number>`COUNT(*) FILTER (WHERE status = 'active')::int`,
            sold: sql<number>`COUNT(*) FILTER (WHERE status = 'sold')::int`,
            removed: sql<number>`COUNT(*) FILTER (WHERE status = 'removed')::int`,
          })
          .from(books),
        db.select({ value: sql<number>`COUNT(*)::int` }).from(reviews),
        db
          .select({
            completedOrders: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
            revenueCents: sql<number>`COALESCE(SUM(${orderItems.unitPriceCents} * ${orderItems.quantity}), 0)::int`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(eq(orders.status, "delivered")),
        db
          .select({ value: sql<number>`COUNT(*)::int` })
          .from(orders)
          .where(ne(orders.status, "delivered")),
      ]);

    const recentListings = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        status: books.status,
        condition: books.condition,
        priceCents: books.priceCents,
        createdAt: books.createdAt,
        sellerName: users.name,
        sellerId: users.id,
        adminNote: books.adminNote,
      })
      .from(books)
      .innerJoin(users, eq(users.id, books.sellerId))
      .orderBy(desc(books.createdAt))
      .limit(40);

    return {
      totals: {
        users: userCount?.value ?? 0,
        listings: bookCount?.value ?? 0,
        activeListings: statusRow?.active ?? 0,
        soldListings: statusRow?.sold ?? 0,
        removedListings: statusRow?.removed ?? 0,
        reviews: reviewCount?.value ?? 0,
        completedOrders: salesRow?.completedOrders ?? 0,
        openOrders: openRow?.value ?? 0,
        revenueCents: salesRow?.revenueCents ?? 0,
      },
      recentListings,
    };
  });
}

/** PATCH /api/admin/stats — moderate a listing (remove or reinstate). */
export async function PATCH(request: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = await readJson(request);
    const bookId = Number(body.bookId);
    const action = str(body.action, 20);
    const note = str(body.note, 500);
    if (!Number.isInteger(bookId)) throw new HttpError(400, "Invalid listing id.");

    if (action === "remove") {
      await db
        .update(books)
        .set({ status: "removed", adminNote: note || "Removed by moderation" })
        .where(eq(books.id, bookId));
    } else if (action === "reinstate") {
      await db.update(books).set({ status: "active", adminNote: null }).where(eq(books.id, bookId));
    } else {
      throw new HttpError(400, "Unknown moderation action.");
    }
    return { ok: true };
  });
}

/** POST /api/admin/stats — create a genre category. */
export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = await readJson(request);
    const name = str(body.name, 80);
    const description = str(body.description, 300);
    if (name.length < 2) throw new HttpError(400, "Genre name is too short.");
    const slug = name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const [existing] = await db.select().from(genres).where(eq(genres.slug, slug)).limit(1);
    if (existing) throw new HttpError(409, "That genre already exists.");

    const [genre] = await db.insert(genres).values({ name, slug, description }).returning();
    return { genre };
  });
}

/** DELETE /api/admin/stats?genreId=4 — only when the genre has no listings. */
export async function DELETE(request: Request) {
  return handle(async () => {
    await requireAdmin();
    const url = new URL(request.url);
    const genreId = Number(url.searchParams.get("genreId"));
    if (!Number.isInteger(genreId)) throw new HttpError(400, "Invalid genre id.");

    const [inUse] = await db
      .select({ value: sql<number>`COUNT(*)::int` })
      .from(books)
      .where(eq(books.genreId, genreId));
    if ((inUse?.value ?? 0) > 0) {
      throw new HttpError(409, "Move or remove its listings before deleting this genre.");
    }

    await db.delete(genres).where(eq(genres.id, genreId));
    return { ok: true };
  });
}

export const dynamic = "force-dynamic";
