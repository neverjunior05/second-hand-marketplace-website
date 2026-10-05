/** GET /api/uploads/:file — stream a validated upload back out of the upload dir. */
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  // Filename is server-generated (hex + ext) — reject anything else outright.
  if (!/^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  const dir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  try {
    const data = await readFile(path.join(dir, file));
    const ext = path.extname(file).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
