import { CONDITION_META, type BookCondition } from "@/lib/conditions";

/**
 * Condition badge — always visible on cards and detail pages because condition
 * is the single biggest trust signal on a secondhand marketplace.
 */
export function ConditionBadge({
  condition,
  size = "sm",
  withMeaning = false,
}: {
  condition: BookCondition;
  size?: "sm" | "md";
  withMeaning?: boolean;
}) {
  const meta = CONDITION_META[condition];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${meta.badgeClass} ${
        size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${meta.dotClass}`} />
      {meta.label}
      {withMeaning ? <span className="font-normal opacity-80">· {meta.meaning}</span> : null}
    </span>
  );
}

export function StatusBadge({ status }: { status: "active" | "sold" | "removed" }) {
  if (status === "active") return null;
  const map = {
    sold: "bg-[#10B981]/15 text-[#0b6b4f] ring-1 ring-[#10B981]/40",
    removed: "bg-stone-200 text-stone-700 ring-1 ring-stone-300",
  } as const;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${map[status]}`}>
      {status}
    </span>
  );
}
