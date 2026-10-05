import { ListingForm, emptyListing } from "@/components/ListingForm";
import { getGenres } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const genres = await getGenres();
  const fallback = genres[0]?.id ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl leading-tight">List a used book</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Type or paste the ISBN and we&apos;ll fetch title, author, description and cover from a free book API.
          Then the only thing we really need from you: an honest condition grade and the flaws that go with it.
        </p>
      </header>
      <ListingForm
        mode="create"
        genres={genres.map((g) => ({ id: g.id, name: g.name }))}
        initial={emptyListing(fallback)}
      />
    </div>
  );
}
