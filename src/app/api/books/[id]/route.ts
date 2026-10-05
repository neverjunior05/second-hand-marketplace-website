import { eq } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema";
import { handle, int, optionalStr, readJson, str } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { isBookCondition, type BookStatus } from "@/lib/conditions";
import { parsePriceToCents } from "@/lib/format";
import { getBookCard, getSellerReviews, getSellerStats } from "@/lib/queries";
import { assertBookExists } from "../route";

type Params = { params: Promise<{ id: string }> };

/** GET /api/books/:id — public. Sold listings stay reachable via direct link. */
export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const bookId = int(id);
    if (!bookId) throw new HttpError(400, "Invalid listing id.");

    const book = await getBookCard(bookId);
    if (!book) throw new HttpError(404, "Listing not found.");
    const stats = await getSellerStats(book.sellerId);
    const sellerReviews = await getSellerReviews(book.sellerId, 5);
    return { book, seller: stats, sellerReviews };
  });
}

/**
 * PATCH /api/books/:id — owner-scoped update (admins may also moderate).
 * Sellers typically tweak price/condition, or flip status to sold/active.
 */
export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const bookId = int(id);
    if (!bookId) throw new HttpError(400, "Invalid listing id.");

    const book = await assertBookExists(bookId);
    const isOwner = book.sellerId === user.id;
    if (!isOwner && user.role !== "admin") throw new HttpError(403, "You can only edit your own listings.");

    const body = await readJson(request);
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = str(body.title, 240) || book.title;
    if (body.author !== undefined) updates.author = str(body.author, 200) || book.author;
    if (body.description !== undefined) updates.description = str(body.description, 3000);
    if (body.conditionNotes !== undefined) {
      const notes = str(body.conditionNotes, 1000);
      if (notes.length < 10) throw new HttpError(400, "Condition notes must be at least 10 characters.");
      updates.conditionNotes = notes;
    }
    if (body.condition !== undefined) {
      if (!isBookCondition(body.condition)) throw new HttpError(400, "Choose a valid condition grade.");
      updates.condition = body.condition;
    }
    if (body.price !== undefined) {
      const priceCents = parsePriceToCents(body.price);
      if (!priceCents || priceCents < 1000) throw new HttpError(400, "Price must be at least ₹10.");
      updates.priceCents = priceCents;
    }
    if (body.originalPrice !== undefined) {
      const original = parsePriceToCents(body.originalPrice);
      updates.originalPriceCents = original && original > 0 ? original : null;
    }
    if (body.quantity !== undefined) {
      const quantity = int(body.quantity) ?? 1;
      updates.quantity = Math.max(0, Math.min(quantity, 20));
    }
    if (body.status !== undefined) {
      const status = str(body.status, 20) as BookStatus;
      if (!["active", "sold", "removed"].includes(status)) throw new HttpError(400, "Invalid status.");
      // Sellers may mark their own copy sold (e.g. sold offline) or re-list it.
      if (status === "sold") {
        updates.soldAt = book.soldAt ?? new Date();
        updates.quantity = 0;
      }
      if (status === "active") {
        updates.soldAt = null;
        if (book.quantity === 0) updates.quantity = 1;
      }
      updates.status = status;
    }
    if (user.role === "admin" && body.adminNote !== undefined) {
      updates.adminNote = str(body.adminNote, 500);
    }

    if (Object.keys(updates).length === 0) throw new HttpError(400, "Nothing to update.");

    const [updated] = await db.update(books).set(updates).where(eq(books.id, bookId)).returning();
    return { book: updated };
  });
}

/** DELETE /api/books/:id — soft-delete so order history snapshots survive. */
export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const bookId = int(id);
    if (!bookId) throw new HttpError(400, "Invalid listing id.");

    const book = await assertBookExists(bookId);
    if (book.sellerId !== user.id && user.role !== "admin") {
      throw new HttpError(403, "You can only remove your own listings.");
    }

    await db
      .update(books)
      .set({ status: "removed", adminNote: user.role === "admin" ? "Removed by moderator" : null })
      .where(eq(books.id, bookId));

    return { ok: true };
  });
}
