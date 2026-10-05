"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BOOK_CONDITIONS, CONDITION_META, type BookCondition } from "@/lib/conditions";
import { apiError } from "@/services/api";
import { booksService, uploadService } from "@/services";

export type GenreChoice = { id: number; name: string };

export type ListingInitial = {
  id?: number;
  title: string;
  author: string;
  isbn: string;
  genreId: number;
  condition: BookCondition;
  conditionNotes: string;
  description: string;
  price: string;
  originalPrice: string;
  quantity: string;
  coverImage: string;
  coverImage2: string;
};

export const emptyListing = (genreId: number): ListingInitial => ({
  title: "",
  author: "",
  isbn: "",
  genreId,
  condition: "good",
  conditionNotes: "",
  description: "",
  price: "",
  originalPrice: "",
  quantity: "1",
  coverImage: "",
  coverImage2: "",
});

/**
 * Create / edit a listing.
 * The ISBN lookup is optional: if the free API has no match the seller simply
 * types the details (and we tell them so instead of failing).
 */
export function ListingForm({
  genres,
  initial,
  mode,
}: {
  genres: GenreChoice[];
  initial: ListingInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<ListingInitial>(initial);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ListingInitial>(key: K, value: ListingInitial[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleLookup() {
    if (!form.isbn) return;
    setLooking(true);
    setLookupMessage(null);
    try {
      const result = await booksService.lookup(form.isbn);
      if (result.found && result.metadata) {
        setForm((prev) => ({
          ...prev,
          title: result.metadata!.title || prev.title,
          author: result.metadata!.author || prev.author,
          description: result.metadata!.description || prev.description,
          coverImage: result.metadata!.coverImage || prev.coverImage,
        }));
        setLookupMessage(`Auto-filled from ${result.metadata.source}. Check the details, then grade the condition.`);
      } else {
        setLookupMessage(result.message ?? "No match found — fill the details manually.");
      }
    } catch (err) {
      setLookupMessage(apiError(err, "Lookup failed — fill the details manually."));
    } finally {
      setLooking(false);
    }
  }

  async function handleUpload(key: "coverImage" | "coverImage2", file: File) {
    setError(null);
    try {
      const result = await uploadService.image(file);
      set(key, result.url);
    } catch (err) {
      setError(apiError(err, "Upload failed."));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      title: form.title,
      author: form.author,
      isbn: form.isbn || null,
      genreId: Number(form.genreId),
      condition: form.condition,
      conditionNotes: form.conditionNotes,
      description: form.description,
      price: form.price,
      originalPrice: form.originalPrice || null,
      quantity: Number(form.quantity) || 1,
      coverImage: form.coverImage || null,
      coverImage2: form.coverImage2 || null,
    };
    try {
      if (mode === "create") {
        const { book } = await booksService.create(payload);
        router.push(`/books/${book.id}`);
      } else if (form.id) {
        await booksService.update(form.id, payload);
        router.push("/listings");
      }
      router.refresh();
    } catch (err) {
      setError(apiError(err, "Could not save the listing."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="font-display text-xl">Step 1 · The book</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="label" htmlFor="isbn">
              ISBN (optional — we can auto-fill the details)
            </label>
            <input
              id="isbn"
              className="input"
              value={form.isbn}
              onChange={(event) => set("isbn", event.target.value)}
              placeholder="9780735211292"
            />
          </div>
          <div className="flex items-end">
            <button type="button" className="btn btn-ghost" onClick={handleLookup} disabled={looking || !form.isbn}>
              {looking ? "Looking up…" : "Look up"}
            </button>
          </div>
        </div>
        {lookupMessage ? <p className="mt-2 text-xs text-brand">{lookupMessage}</p> : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="title">
              Title
            </label>
            <input id="title" className="input" value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="author">
              Author
            </label>
            <input id="author" className="input" value={form.author} onChange={(e) => set("author", e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="genre">
              Genre
            </label>
            <select
              id="genre"
              className="input"
              value={form.genreId}
              onChange={(event) => set("genreId", Number(event.target.value))}
              required
            >
              <option value="">Choose a genre</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="description">
              Short description
            </label>
            <textarea
              id="description"
              className="input min-h-24"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Why are you selling it? Who will love it?"
              required
            />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl">Step 2 · Grade the condition</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Pick the honest grade — the platform explains it to buyers for you. Then describe the actual flaws.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {BOOK_CONDITIONS.map((condition) => {
            const meta = CONDITION_META[condition];
            const active = form.condition === condition;
            return (
              <button
                key={condition}
                type="button"
                onClick={() => set("condition", condition)}
                className={`rounded-xl border p-3 text-left text-sm transition ${
                  active ? "border-brand bg-brand-soft" : "border-hairline bg-paper hover:border-brand"
                }`}
              >
                <span className="font-semibold">{meta.label}</span>
                <span className="mt-1 block text-xs text-ink-soft">{meta.meaning}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 rounded-xl bg-cream p-3 text-xs text-ink-soft">{CONDITION_META[form.condition].definition}</p>
        <div className="mt-4">
          <label className="label" htmlFor="conditionNotes">
            Describe the specific flaws (required)
          </label>
          <textarea
            id="conditionNotes"
            className="input min-h-20"
            value={form.conditionNotes}
            onChange={(e) => set("conditionNotes", e.target.value)}
            placeholder="e.g. highlighting on chapters 3-5, small inscription inside the front cover"
            required
            minLength={10}
          />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl">Step 3 · Price and photos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="price">
              Your price (₹)
            </label>
            <input id="price" className="input" value={form.price} onChange={(e) => set("price", e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="original">
              Original retail (₹, optional)
            </label>
            <input id="original" className="input" value={form.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="quantity">
              Copies (usually 1)
            </label>
            <input id="quantity" className="input" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["coverImage", "coverImage2"] as const).map((key, index) => (
            <div key={key} className="rounded-xl border border-hairline bg-cream p-3">
              <label className="label">{index === 0 ? "Cover photo" : "Condition photo (optional)"}</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(key, file);
                }}
              />
              <p className="mt-1 text-[11px] text-ink-soft">JPG, PNG or WEBP · max 5 MB</p>
              <input
                className="input mt-2 text-xs"
                value={form[key]}
                onChange={(event) => set(key, event.target.value)}
                placeholder="…or paste an image URL"
              />
            </div>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-[#F5484B]">{error}</p> : null}
      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? "Publish listing" : "Save changes"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
