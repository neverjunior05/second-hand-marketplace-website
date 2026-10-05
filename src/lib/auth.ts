/**
 * Auth: bcrypt password hashing + JWT session cookie.
 *
 * Role model note — a marketplace user is *both* buyer and seller, so there is
 * no "seller" role to gate. `role` only distinguishes the elevated `admin`.
 * Listing edits are guarded by ownership ("is this your listing?"), not by role.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

const COOKIE_NAME = "bindery_token";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const secret = process.env.JWT_SECRET ?? "bindery-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  city: string | null;
};

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    city: user.city,
  };
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function signToken(userId: number) {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function setSessionCookie(userId: number) {
  const token = await signToken(userId);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Returns the logged-in user (or null). Safe to call from server components. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) return null;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ? toSessionUser(user) : null;
  } catch {
    return null;
  }
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Role middleware equivalent for route handlers. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "You must be signed in to do that.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new HttpError(403, "Admin access required.");
  return user;
}
