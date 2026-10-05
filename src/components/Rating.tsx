import { initials } from "@/lib/format";

/** Star row for ratings. Empty stars stay muted, never alarming. */
export function Rating({
  value: raw,
  count,
  size = "sm",
  showCount = true,
}: {
  value: number | string | null;
  count?: number;
  size?: "sm" | "md";
  showCount?: boolean;
}) {
  // Postgres NUMERIC can arrive as a string depending on the driver — normalise.
  const value =
    raw === null || raw === undefined || raw === ""
      ? null
      : typeof raw === "number"
        ? raw
        : Number.parseFloat(raw);
  const rounded = value && Number.isFinite(value) ? Math.round(value) : 0;
  const textClass = size === "md" ? "text-base" : "text-xs";
  if (value === null || value === undefined) {
    return (
      <span className={`inline-flex items-center gap-1 ${textClass} text-ink-soft`}>
        <span aria-hidden>☆☆☆☆☆</span>
        {showCount ? <span>No reviews yet</span> : null}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${textClass}`}>
      <span className="text-[#F59E0B]" aria-hidden>
        {"★".repeat(rounded)}
        <span className="text-hairline">{"★".repeat(5 - rounded)}</span>
      </span>
      <span className="font-semibold text-ink">{(value ?? 0).toFixed(1)}</span>
      {showCount && count !== undefined ? <span className="text-ink-soft">({count})</span> : null}
    </span>
  );
}

/** Initials avatar — no upload needed, deterministic per name. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-brand text-sm font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: "#0F5132" }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
