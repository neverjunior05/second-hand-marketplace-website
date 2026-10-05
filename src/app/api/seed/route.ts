/**
 * POST /api/seed — clear + repopulate the database with sample data.
 * Open while the platform is empty (first-run bootstrap); admin-only afterwards.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { runSeed } from "@/db/seed";

export async function POST() {
  return handle(async () => {
    const [{ count }] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(users);
    if (count > 0) {
      const user = await getSessionUser();
      if (user?.role !== "admin") {
        return { ok: false, message: "Seed data already loaded. Sign in as an admin to reseed." };
      }
    }
    const result = await runSeed();
    return { ok: true, result };
  });
}
