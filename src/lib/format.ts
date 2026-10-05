export function formatPrice(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return `₹${(cents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function parsePriceToCents(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return Math.round(input * 100);
  if (typeof input === "string") {
    const cleaned = input.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const value = Number.parseFloat(cleaned);
    if (Number.isNaN(value)) return null;
    return Math.round(value * 100);
  }
  return null;
}

export function discountPercent(priceCents: number, originalCents: number | null | undefined) {
  if (!originalCents || originalCents <= priceCents) return null;
  return Math.round(((originalCents - priceCents) / originalCents) * 100);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function relativeTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
