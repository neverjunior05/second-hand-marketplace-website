/** GET /api/orders/sales — the seller side: orders containing this user's listings. */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const seller = await requireUser();

    const lines = await db
      .select({
        itemId: orderItems.id,
        orderId: orderItems.orderId,
        title: orderItems.title,
        author: orderItems.author,
        condition: orderItems.condition,
        coverImage: orderItems.coverImage,
        quantity: orderItems.quantity,
        unitPriceCents: orderItems.unitPriceCents,
        reviewed: orderItems.reviewed,
        orderStatus: orders.status,
        createdAt: orders.createdAt,
        buyerName: users.name,
        buyerCity: users.city,
        shippingName: orders.shippingName,
        shippingAddress: orders.shippingAddress,
        shippingCity: orders.shippingCity,
        shippingPostal: orders.shippingPostal,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(users, eq(users.id, orders.buyerId))
      .where(eq(orderItems.sellerId, seller.id))
      .orderBy(desc(orders.createdAt));

    const grouped = new Map<
      number,
      {
        orderId: number;
        status: string;
        createdAt: Date;
        buyerName: string;
        buyerCity: string | null;
        shippingAddress: string;
        shippingCity: string;
        shippingPostal: string;
        earningsCents: number;
        items: Array<{
          itemId: number;
          title: string;
          author: string;
          condition: string;
          coverImage: string | null;
          quantity: number;
          unitPriceCents: number;
          reviewed: number;
        }>;
      }
    >();

    for (const line of lines) {
      const entry = grouped.get(line.orderId) ?? {
        orderId: line.orderId,
        status: line.orderStatus,
        createdAt: line.createdAt,
        buyerName: line.buyerName,
        buyerCity: line.buyerCity,
        shippingAddress: line.shippingAddress,
        shippingCity: line.shippingCity,
        shippingPostal: line.shippingPostal,
        earningsCents: 0,
        items: [],
      };
      entry.earningsCents += line.unitPriceCents * line.quantity;
      entry.items.push({
        itemId: line.itemId,
        title: line.title,
        author: line.author,
        condition: line.condition,
        coverImage: line.coverImage,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        reviewed: line.reviewed,
      });
      grouped.set(line.orderId, entry);
    }

    const sales = [...grouped.values()];
    const earningsCents = sales
      .filter((s) => s.status === "delivered")
      .reduce((sum, s) => sum + s.earningsCents, 0);

    return { sales, earningsCents, pendingCount: sales.filter((s) => s.status === "pending").length };
  });
}


