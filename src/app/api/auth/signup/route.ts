import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle, jsonError, readJson, str } from "@/lib/api";
import { HttpError, hashPassword, setSessionCookie, toSessionUser } from "@/lib/auth";

/** POST /api/auth/signup — create an account (every account can buy AND sell). */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const name = str(body.name, 120);
    const email = str(body.email, 200).toLowerCase();
    const password = str(body.password, 200);
    const city = str(body.city, 120) || null;

    if (name.length < 2) throw new HttpError(400, "Please enter your full name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) throw new HttpError(409, "An account with that email already exists.");

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: await hashPassword(password), city, accent: "emerald" })
      .returning();

    await setSessionCookie(user.id);
    return { user: toSessionUser(user) };
  });
}

export async function GET() {
  return jsonError(405, "Use POST to sign up.");
}
