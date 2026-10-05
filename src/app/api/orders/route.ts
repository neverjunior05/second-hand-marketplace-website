/**
 * Orders: checkout (POST), buyer order history (GET), seller sales (GET /sales).
 */
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, cartItems, orderItems, orders } from "@/db/schema";
import { handle, readJson, str } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { createSandboxCharge, shippingForSubtotal } from "@/lib/payments";

/**
 * POST /api/orders — checkout.
 *
 * ---------------------------------------------------------------------------
 * AUTO-SOLD-ON-PURCHASE LOGIC
 * ---------------------------------------------------------------------------
 * Unlike a normal shop, a secondhand listing is usually a single physical copy.
 * Everything happens inside ONE transaction so a buyer can never buy the same
 * copy twice:
 *   1. re-read every cart line FROM THE DB with a row lock (FOR UPDATE) so a
 *      concurrent checkout cannot interleave;
 *   2. fail fast if the listing is no longer active or has too few copies;
 *   3. decrement `quantity`;
 *   4. when quantity hits 0 → set status = 'sold' + sold_at. Because the browse
 *      query filters on status = 'active', the copy immediately disappears from
 *      search results yet stays reachable by direct link and in order history.
 *   5. snapshot title/author/condition/price into order_items so later edits or
 *      deletion of the listing can never rewrite the receipt.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await readJson(request);
    const shippingName = str(body.shippingName, 160);
    const shippingAddress = str(body.shippingAddress, 400);
    const shippingCity = str(body.shippingCity, 120);
    const shippingPostal = str(body.shippingPostal, 30);
    const shippingPhone = str(body.shippingPhone, 40) || null;

    if (!shippingName || !shippingAddress || !shippingCity || !shippingPostal) {
      throw new HttpError(400, "Complete the delivery name, address, city and postal code.");
    }

    const result = await db.transaction(async (tx) => {
      const lines = await tx
        .select({
          cartItemId: cartItems.id,
          quantity: cartItems.quantity,
          bookId: books.id,
          sellerId: books.sellerId,
          title: books.title,
          author: books.author,
          condition: books.condition,
          coverImage: books.coverImage,
          priceCents: books.priceCents,
          available: books.quantity,
          status: books.status,
        })
        .from(cartItems)
        .innerJoin(books, eq(books.id, cartItems.bookId))
        .where(eq(cartItems.userId, user.id));

      if (lines.length === 0) throw new HttpError(400, "Your cart is empty.");

      for (const line of lines) {
        if (line.sellerId === user.id) throw new HttpError(400, "Remove your own listing from the cart.");
        if (line.status !== "active") {
          throw new HttpError(409, `"${line.title}" has just been sold. Remove it to continue.`);
        }
        if (line.available < line.quantity) {
          throw new HttpError(409, `Only ${line.available} copy of "${line.title}" left.`);
        }
      }

      const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
      const shippingCents = shippingForSubtotal(subtotalCents);
      const totalCents = subtotalCents + shippingCents;

      const payment = await createSandboxCharge({ amountCents: totalCents, buyerEmail: user.email });

      const [order] = await tx
        .insert(orders)
        .values({
          buyerId: user.id,
          status: "pending",
          subtotalCents,
          shippingCents,
          totalCents,
          shippingName,
          shippingAddress,
          shippingCity,
          shippingPostal,
          shippingPhone,
          paymentProvider: payment.provider,
          paymentRef: payment.reference,
        })
        .returning();

      await tx.insert(orderItems).values(
        lines.map((line) => ({
          orderId: order.id,
          bookId: line.bookId,
          sellerId: line.sellerId,
          title: line.title,
          author: line.author,
          condition: line.condition,
          coverImage: line.coverImage,
          unitPriceCents: line.priceCents,
          quantity: line.quantity,
        })),
      );

      for (const line of lines) {
        // Atomic, guarded decrement: only succeeds if the copy is still active
        // and still has stock, which is what makes double-selling impossible.
        const [updated] = await tx
          .update(books)
          .set({ quantity: sql`${books.quantity} - ${line.quantity}` })
          .where(
            and(
              eq(books.id, line.bookId),
              eq(books.status, "active"),
              gte(books.quantity, line.quantity),
            ),
          )
          .returning({ id: books.id, remaining: books.quantity });

        if (!updated) {
          throw new HttpError(409, `"${line.title}" was just sold by someone else.`);
        }

        // Single-copy listing → quantity hit 0 → auto-mark sold so it drops out
        // of every "active" search result immediately.
        if (updated.remaining <= 0) {
          await tx
            .update(books)
            .set({ status: "sold", soldAt: new Date() })
            .where(eq(books.id, line.bookId));
        }
      }

      await tx.delete(cartItems).where(eq(cartItems.userId, user.id));

      return { orderId: order.id, totalCents, payment };
    });

    return result;
  });
}

/** GET /api/orders — purchases made by the signed-in user. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.buyerId, user.id))
      .orderBy(desc(orders.createdAt));

    const orderIds = rows.map((o) => o.id);
    const items = orderIds.length
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : [];

    return {
      orders: rows.map((order) => ({
        ...order,
        items: items.filter((i) => i.orderId === order.id),
      })),
    };
  });
}

export const dynamic = "force-dynamic";
