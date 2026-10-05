/** GET /api/admin/genres — genre list with active listing counts (admin only). */
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getGenres } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return { genres: await getGenres() };
  });
}
