import { handle, str } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { fetchIsbnMetadata } from "@/lib/isbn";

/**
 * GET /api/books/lookup?isbn=9780735211292
 * Optional convenience endpoint — auto-fills title/author/cover/description
 * from a free ISBN API. Returns { found: false } (never an error) when the ISBN
 * is unknown so the listing form can degrade gracefully.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const isbn = str(url.searchParams.get("isbn"), 20);
    if (!isbn) throw new HttpError(400, "Provide an ISBN to look up.");

    const metadata = await fetchIsbnMetadata(isbn);
    if (!metadata) {
      return { found: false, message: "No match found — fill the details manually." };
    }
    return { found: true, metadata };
  });
}
