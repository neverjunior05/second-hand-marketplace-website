/**
 * POST /api/uploads — book cover / condition photo upload.
 *
 * Replaces the Express `multer` middleware in a route-handler world:
 *  - multipart/form-data only
 *  - MIME allow-list (jpeg / png / webp) AND magic-byte sniffing
 *  - 5 MB size ceiling, enforced before the file is written
 *  - random hex filename so user-supplied names can never escape the dir
 */
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { handle } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

export const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export async function POST(request: Request) {
  return handle(async () => {
    await requireUser();

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new HttpError(400, "Send the photo as multipart/form-data.");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file provided.");
    if (file.size === 0) throw new HttpError(400, "That file is empty.");
    if (file.size > MAX_BYTES) throw new HttpError(413, "Images must be 5 MB or smaller.");

    const declared = file.type;
    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMime(new Uint8Array(buffer));

    if (!ALLOWED.has(declared) || !sniffed || sniffed !== declared) {
      throw new HttpError(415, "Only JPG, PNG or WEBP images are allowed.");
    }

    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${EXTENSION[sniffed]}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    return { url: `/api/uploads/${filename}`, size: buffer.byteLength, type: sniffed };
  });
}
