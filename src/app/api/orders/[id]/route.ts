/**
 * PATCH /api/orders/:id — move an order through Pending → Shipped → Delivered.
 * The seller who owns a line may advance the status; the buyer may cancel while
 * pending; an admin may do either.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { books, orderItems, orders } from "@/db/schema";
import { handle, int, readJson, str } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/conditions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const orderId = int(id);
    if (!orderId) throw new HttpError(400, "Invalid order id.");

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new HttpError(404, "Order not found.");

    const lines = await db.select().from(orderItems).where(inArray(orderItems.orderId, [orderId]));
    const isSellerForOrder = lines.some((l) => l.sellerId === user.id);
    const isBuyer = order.buyerId === user.id;

    if (!isSellerForOrder && !isBuyer && user.role !== "admin") {
      throw new HttpError(403, "You are not part of this order.");
    }

    const body = await readJson(request);
    const status = str(body.status, 20) as OrderStatus;
    if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, "Invalid order status.");
    if (status === order.status) throw new HttpError(400, "Order is already in that status.");

    if (status === "cancelled") {
      if (!isBuyer && user.role !== "admin") throw new HttpError(403, "Only the buyer can cancel an order.");
      if (order.status !== "pending") throw new HttpError(409, "Only pending orders can be cancelled.");
      // Cancel → put the copies back on the market.
      for (const line of lines) {
        if (!line.bookId) continue;
        await db
          .update(books)
          .set({ quantity: line.quantity, status: "active", soldAt: null })
          .where(eq(books.id, line.bookId));
      }
    } else {
      if (!isSellerForOrder && user.role !== "admin") {
        throw new HttpError(403, "Only the seller can advance an order.");
      }
      const allowed: Record<string, OrderStatus[]> = {
        pending: ["shipped", "delivered"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: [],
      };
      if (!allowed[order.status].includes(status)) {
        throw new HttpError(409, `Cannot move an order from ${order.status} to ${status}.`);
      }
    }

    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    return { order: updated };
  });
}

/** GET /api/orders/:id — order detail for buyer or the sellers involved. */
export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const orderId = int(id);
    if (!orderId) throw new HttpError(400, "Invalid order id.");

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new HttpError(404, "Order not found.");

    const lines = await db.select().from(orderItems).where(inArray(orderItems.orderId, [orderId]));
    const isSellerForOrder = lines.some((l) => l.sellerId === user.id);
    if (order.buyerId !== user.id && !isSellerForOrder && user.role !== "admin") {
      throw new HttpError(403, "You are not part of this order.");
    }
    return { order, items: lines };
  });
}
