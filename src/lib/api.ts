import { NextResponse } from "next/server";
import { HttpError } from "@/lib/auth";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler so thrown HttpErrors become clean JSON responses. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error.status, error.message);
    console.error("[api]", error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return jsonError(500, message);
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function str(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function optionalStr(value: unknown, max = 5000): string | null {
  const s = str(value, max);
  return s.length > 0 ? s : null;
}

export function int(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}
