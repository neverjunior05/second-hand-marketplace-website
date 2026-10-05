import { handle } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

/** GET /api/auth/me — current session (null when signed out). */
export async function GET() {
  return handle(async () => ({ user: await getSessionUser() }));
}
