/** GET /api/users/:id — public seller profile: active listings + rating. */
import { handle, int } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { getPublicSeller, getSellerReviews, getSellerStats, listBooks } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const sellerId = int(id);
    if (!sellerId) throw new HttpError(400, "Invalid seller id.");

    const seller = await getPublicSeller(sellerId);
    if (!seller) throw new HttpError(404, "Seller not found.");

    const stats = await getSellerStats(sellerId);
    const { items: listings } = await listBooks({ sellerId, status: "active", sort: "newest", limit: 48 });
    const sold = await listBooks({ sellerId, status: "sold", sort: "newest", limit: 8 });
    const sellerReviews = await getSellerReviews(sellerId, 20);

    return { seller, stats, listings, sold: sold.items, reviews: sellerReviews };
  });
}
