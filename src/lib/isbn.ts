/**
 * ---------------------------------------------------------------------------
 * OPTIONAL ISBN LOOKUP — isolated so it is swappable or removable.
 * ---------------------------------------------------------------------------
 * Sellers usually just want to scan/type an ISBN rather than typing out full
 * details. We try Google Books first (free, no key for basic lookups) and fall
 * back to the Open Library API. If both fail we simply return null and the
 * seller fills the form manually — listing creation never blocks on this.
 *
 * To swap providers, change `fetchIsbnMetadata` only. Nothing else imports a
 * vendor type.
 */
export type IsbnMetadata = {
  source: "google-books" | "open-library";
  title: string;
  author: string;
  description: string | null;
  publishedYear: number | null;
  coverImage: string | null;
  isbn: string;
};

const cleanIsbn = (raw: string) => raw.replace(/[^0-9Xx]/g, "");

async function fromGoogleBooks(isbn: string): Promise<IsbnMetadata | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${key ? `&key=${key}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    items?: Array<{
      volumeInfo?: {
        title?: string;
        authors?: string[];
        description?: string;
        publishedDate?: string;
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
      };
    }>;
  };
  const volume = data.items?.[0]?.volumeInfo;
  if (!volume?.title) return null;
  return {
    source: "google-books",
    isbn,
    title: volume.title,
    author: volume.authors?.join(", ") ?? "Unknown author",
    description: volume.description ? volume.description.replace(/<[^>]+>/g, "").slice(0, 1200) : null,
    publishedYear: volume.publishedDate ? Number(volume.publishedDate.slice(0, 4)) || null : null,
    coverImage: volume.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
  };
}

async function fromOpenLibrary(isbn: string): Promise<IsbnMetadata | null> {
  // The search endpoint returns everything we need (incl. author) in one call.
  try {
    const searchRes = await fetch(
      `https://openlibrary.org/search.json?q=isbn:${isbn}&limit=1&fields=title,author_name,first_publish_year,cover_i,first_sentence`,
      { cache: "no-store", headers: { Accept: "application/json" } },
    );
    if (searchRes.ok) {
      const search = (await searchRes.json()) as {
        docs?: Array<{
          title?: string;
          author_name?: string[];
          first_publish_year?: number;
          cover_i?: number;
          first_sentence?: string[] | string;
        }>;
      };
      const doc = search.docs?.[0];
      if (doc?.title) {
        const sentence = Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence;
        return {
          source: "open-library",
          isbn,
          title: doc.title,
          author: doc.author_name?.join(", ") ?? "Unknown author",
          description: sentence ? String(sentence).slice(0, 1200) : null,
          publishedYear: doc.first_publish_year ?? null,
          coverImage: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
        };
      }
    }
  } catch {
    /* fall through to the edition endpoint */
  }

  const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    title?: string;
    authors?: Array<{ key: string }>;
    covers?: number[];
    description?: string | { value?: string };
    publish_date?: string;
  };
  if (!data.title) return null;

  let author = "Unknown author";
  const authorKey = data.authors?.[0]?.key;
  if (authorKey) {
    try {
      const authorRes = await fetch(`https://openlibrary.org${authorKey}.json`, { cache: "no-store" });
      if (authorRes.ok) {
        const authorData = (await authorRes.json()) as { name?: string };
        if (authorData.name) author = authorData.name;
      }
    } catch {
      /* author enrichment is best-effort only */
    }
  }

  const rawDescription =
    typeof data.description === "string" ? data.description : data.description?.value ?? null;

  return {
    source: "open-library",
    isbn,
    title: data.title,
    author,
    description: rawDescription ? rawDescription.slice(0, 1200) : null,
    publishedYear: data.publish_date ? Number(data.publish_date.slice(0, 4)) || null : null,
    coverImage: data.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
      : null,
  };
}

export function isValidIsbn(raw: string) {
  const isbn = cleanIsbn(raw);
  return isbn.length === 10 || isbn.length === 13;
}

export async function fetchIsbnMetadata(rawIsbn: string): Promise<IsbnMetadata | null> {
  const isbn = cleanIsbn(rawIsbn);
  if (!isValidIsbn(isbn)) return null;
  try {
    const google = await fromGoogleBooks(isbn);
    if (google) return google;
  } catch {
    /* fall through to Open Library */
  }
  try {
    return await fromOpenLibrary(isbn);
  } catch {
    return null;
  }
}
