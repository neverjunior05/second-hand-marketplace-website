/**
 * Reviews are about the SELLER and the transaction, never the book.
 * POST is gated server-side: only a buyer with a DELIVERED order containing an
 * item from that seller may review them, and only once per order+seller pair.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, reviews, users } from "@/db/schema";
import { handle, int, readJson, str } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { getSellerStats } from "@/lib/queries";

/** GET /api/reviews?sellerId=3 — public reviews for a seller + aggregate rating. */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const sellerId = int(url.searchParams.get("sellerId"));
    if (!sellerId) throw new HttpError(400, "sellerId is required.");

    const stats = await getSellerStats(sellerId);
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
      .orderBy(desc(reviews.createdAt));

    return { reviews: rows, averageRating: stats.averageRating, reviewCount: stats.reviewCount };
  });
}

/** POST /api/reviews — verified purchasers only (enforced here, never client-side). */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await readJson(request);
    const orderId = int(body.orderId);
    const sellerId = int(body.sellerId);
    const rating = int(body.rating);
    const comment = str(body.comment, 1500);

    if (!orderId || !sellerId) throw new HttpError(400, "Missing order or seller.");
    if (!rating || rating < 1 || rating > 5) throw new HttpError(400, "Rating must be between 1 and 5.");
    if (comment.length < 10) throw new HttpError(400, "Please write at least a sentence about the transaction.");

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.buyerId !== user.id) throw new HttpError(403, "You can only review your own orders.");
    if (order.status !== "delivered") {
      throw new HttpError(403, "You can review a seller once your order is delivered.");
    }

    const [line] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), eq(orderItems.sellerId, sellerId)))
      .limit(1);
    if (!line) throw new HttpError(403, "That seller is not part of this order.");

    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.orderId, orderId), eq(reviews.buyerId, user.id), eq(reviews.sellerId, sellerId)))
      .limit(1);
    if (existing) throw new HttpError(409, "You have already reviewed this seller for that order.");

    const [review] = await db
      .insert(reviews)
      .values({ orderId, sellerId, buyerId: user.id, rating, comment })
      .returning();

    await db.update(orderItems).set({ reviewed: 1 }).where(eq(orderItems.id, line.id));

    // Recompute the aggregate immediately so the UI reflects it without a refresh.
    const stats = await getSellerStats(sellerId);
    return { review, averageRating: stats.averageRating, reviewCount: stats.reviewCount };
  });
}


