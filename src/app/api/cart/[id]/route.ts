import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { books, cartItems } from "@/db/schema";
import { handle, int, readJson } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/cart/:id — change quantity (0 removes the line). */
export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const itemId = int(id);
    if (!itemId) throw new HttpError(400, "Invalid cart item.");

    const [item] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, user.id)))
      .limit(1);
    if (!item) throw new HttpError(404, "Cart item not found.");

    const body = await readJson(request);
    const quantity = int(body.quantity) ?? 1;

    if (quantity <= 0) {
      await db.delete(cartItems).where(eq(cartItems.id, itemId));
      return { ok: true, removed: true };
    }

    const [book] = await db.select().from(books).where(eq(books.id, item.bookId)).limit(1);
    if (!book || book.status !== "active") throw new HttpError(409, "This copy is no longer available.");

    await db
      .update(cartItems)
      .set({ quantity: Math.min(quantity, book.quantity) })
      .where(eq(cartItems.id, itemId));
    return { ok: true };
  });
}

/** DELETE /api/cart/:id */
export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const itemId = int(id);
    if (!itemId) throw new HttpError(400, "Invalid cart item.");

    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.userId, user.id)));
    return { ok: true };
  });
}
