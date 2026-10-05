import { notFound, redirect } from "next/navigation";
import { ListingForm } from "@/components/ListingForm";
import { getSessionUser } from "@/lib/auth";
import { getBookCard, getGenres } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) notFound();

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [book, genres] = await Promise.all([getBookCard(bookId), getGenres()]);
  if (!book) notFound();
  // Ownership middleware equivalent: only the listing's owner (or an admin) edits.
  if (book.sellerId !== user.id && user.role !== "admin") {
    return (
      <div className="card p-10 text-center">
        <h1 className="font-display text-2xl">That isn&apos;t your listing</h1>
        <p className="mt-2 text-sm text-ink-soft">You can only edit books you are selling.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl">Edit listing</h1>
        <p className="mt-1 text-sm text-ink-soft">{book.title}</p>
      </header>
      <ListingForm
        mode="edit"
        genres={genres.map((g) => ({ id: g.id, name: g.name }))}
        initial={{
          id: book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn ?? "",
          genreId: book.genreId,
          condition: book.condition,
          conditionNotes: book.conditionNotes,
          description: book.description,
          price: String(book.priceCents / 100),
          originalPrice: book.originalPriceCents ? String(book.originalPriceCents / 100) : "",
          quantity: String(book.quantity),
          coverImage: book.coverImage ?? "",
          coverImage2: book.coverImage2 ?? "",
        }}
      />
    </div>
  );
}
