import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { books, genres } from "@/db/schema";
import { handle, int, optionalStr, readJson, str } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { isBookCondition } from "@/lib/conditions";
import { parsePriceToCents } from "@/lib/format";
import { listBooks, type BrowseParams } from "@/lib/queries";

/**
 * GET /api/books — public browse / search / filter / sort.
 * Query: q, genre, condition (repeatable), min, max, sort, sellerId, status, limit, offset
 * Sold listings are excluded from the default results (see listBooks).
 */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const params: BrowseParams = {
      q: url.searchParams.get("q") ?? undefined,
      genre: url.searchParams.get("genre") ?? undefined,
      condition: url.searchParams.getAll("condition"),
      minPrice: int(url.searchParams.get("min")) ?? undefined,
      maxPrice: int(url.searchParams.get("max")) ?? undefined,
      sort: (url.searchParams.get("sort") as BrowseParams["sort"]) ?? "newest",
      sellerId: int(url.searchParams.get("sellerId")) ?? undefined,
      status: (url.searchParams.get("status") as BrowseParams["status"]) ?? "active",
      limit: Math.min(int(url.searchParams.get("limit")) ?? 24, 60),
      offset: int(url.searchParams.get("offset")) ?? 0,
    };
    const { items, total } = await listBooks(params);
    return { books: items, total };
  });
}

/** POST /api/books — create a listing (any signed-in member can sell). */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await readJson(request);

    const title = str(body.title, 240);
    const author = str(body.author, 200);
    const isbn = optionalStr(body.isbn, 20);
    const condition = body.condition;
    const conditionNotes = str(body.conditionNotes, 1000);
    const description = str(body.description, 3000);
    const priceCents = parsePriceToCents(body.price);
    const originalPriceCents = parsePriceToCents(body.originalPrice);
    const quantity = Math.max(1, Math.min(int(body.quantity) ?? 1, 20));
    const genreId = int(body.genreId);
    const coverImage = optionalStr(body.coverImage, 1000);
    const coverImage2 = optionalStr(body.coverImage2, 1000);
    const metadataSource = optionalStr(body.metadataSource, 40);
    const publishedYear = int(body.publishedYear);

    if (title.length < 2) throw new HttpError(400, "Title is required.");
    if (author.length < 2) throw new HttpError(400, "Author is required.");
    if (!isBookCondition(condition)) throw new HttpError(400, "Choose a valid condition grade.");
    if (conditionNotes.length < 10) {
      throw new HttpError(400, "Describe the specific flaws for this condition grade (min 10 characters).");
    }
    if (!description) throw new HttpError(400, "Add a short description.");
    if (!priceCents || priceCents < 1000) throw new HttpError(400, "Price must be at least ₹10.");
    if (!genreId) throw new HttpError(400, "Choose a genre.");

    const [genre] = await db.select({ id: genres.id }).from(genres).where(eq(genres.id, genreId)).limit(1);
    if (!genre) throw new HttpError(400, "That genre does not exist.");

    const [book] = await db
      .insert(books)
      .values({
        sellerId: user.id,
        genreId,
        title,
        author,
        isbn,
        condition,
        conditionNotes,
        description,
        priceCents,
        originalPriceCents: originalPriceCents && originalPriceCents > priceCents ? originalPriceCents : null,
        quantity,
        coverImage,
        coverImage2,
        publishedYear: publishedYear && publishedYear > 1400 ? publishedYear : null,
        metadataSource,
        status: "active",
      })
      .returning();

    return { book };
  });
}

/** Helper used by the ownership check on PATCH/DELETE. */
export async function assertBookExists(id: number) {
  const [book] = await db.select().from(books).where(and(eq(books.id, id))).limit(1);
  if (!book) throw new HttpError(404, "Listing not found.");
  return book;
}
