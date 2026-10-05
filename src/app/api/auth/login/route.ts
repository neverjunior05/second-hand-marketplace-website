import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle, readJson, str } from "@/lib/api";
import { HttpError, setSessionCookie, toSessionUser, verifyPassword } from "@/lib/auth";

/** POST /api/auth/login — verify bcrypt hash, issue JWT session cookie. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const email = str(body.email, 200).toLowerCase();
    const password = str(body.password, 200);

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw new HttpError(401, "Email or password is incorrect.");

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Email or password is incorrect.");

    await setSessionCookie(user.id);
    return { user: toSessionUser(user) };
  });
}
