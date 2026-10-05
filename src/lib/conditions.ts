/**
 * ---------------------------------------------------------------------------
 * CONDITION GRADING — a fixed enum, not free text.
 * ---------------------------------------------------------------------------
 * Why? "Good" has to mean the same thing to every seller and every buyer.
 * If condition were free text, one seller's "Good" is another's "rough copy"
 * and it becomes impossible to filter, sort, or trust. So the *grade* is a
 * closed, ordered enum stored in the DB, and the seller's specific flaws
 * (highlighting on chapters 3-5, cracked spine, ...) live in a separate
 * required `conditionNotes` field.
 *
 * Rank drives sorting: `new` is the best possible grade, `acceptable` the
 * worst. Nothing here is "red" — a used book that is acceptable but readable
 * should never read as an alarm.
 */
export const BOOK_CONDITIONS = [
  "new",
  "like_new",
  "good",
  "fair",
  "acceptable",
] as const;

export type BookCondition = (typeof BOOK_CONDITIONS)[number];

export type ConditionMeta = {
  value: BookCondition;
  label: string;
  /** Short meaning shown on the badge tooltip / detail page. */
  meaning: string;
  /** Full buyer-facing explanation of the grade. */
  definition: string;
  /** Typical flaws a seller should mention. */
  typicalFlaws: string;
  rank: number;
  /** Tailwind classes — emerald → amber → muted gray-amber escalation. */
  badgeClass: string;
  dotClass: string;
};

export const CONDITION_META: Record<BookCondition, ConditionMeta> = {
  new: {
    value: "new",
    label: "New",
    meaning: "Unused, unread",
    definition:
      "Unused and unread. No markings, creases or shelf wear of any kind. Usually a duplicate copy or an unwanted gift.",
    typicalFlaws: "None expected.",
    rank: 5,
    badgeClass: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
    dotClass: "bg-emerald-600",
  },
  like_new: {
    value: "like_new",
    label: "Like New",
    meaning: "Barely any wear",
    definition:
      "Read once at most. Clean pages, tight binding, no highlighting or writing. The dust jacket may show the faintest edge touch.",
    typicalFlaws: "At most a faint scuff on the dust jacket.",
    rank: 4,
    badgeClass: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
    dotClass: "bg-emerald-600",
  },
  good: {
    value: "good",
    label: "Good",
    meaning: "Read, minor wear",
    definition:
      "An obviously read copy in solid shape. Binding intact, all pages present, light shelf wear on edges or spine. Any marking is minor and disclosed.",
    typicalFlaws: "Light spine crease, small inscription, mild page toning.",
    rank: 3,
    badgeClass: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
    dotClass: "bg-amber-500",
  },
  fair: {
    value: "fair",
    label: "Fair",
    meaning: "Well loved, complete",
    definition:
      "A well-loved reading copy. Noticeable wear — creased covers, a leaning spine, limited highlighting or underlining — but complete and perfectly readable.",
    typicalFlaws: "Creased covers, leaning spine, some highlighting.",
    rank: 2,
    badgeClass: "bg-stone-200 text-stone-800 ring-1 ring-stone-300",
    dotClass: "bg-stone-500",
  },
  acceptable: {
    value: "acceptable",
    label: "Acceptable",
    meaning: "Readable, worn",
    definition:
      "Heavy wear but the text is complete and legible. Expect significant highlighting, a sunned cover, loose but attached binding, or previous-owner stamps.",
    typicalFlaws: "Heavy highlighting, sunned cover, worn corners.",
    rank: 1,
    badgeClass: "bg-stone-200 text-stone-800 ring-1 ring-stone-300",
    dotClass: "bg-stone-500",
  },
};

export const CONDITION_RANK: Record<BookCondition, number> = {
  new: CONDITION_META.new.rank,
  like_new: CONDITION_META.like_new.rank,
  good: CONDITION_META.good.rank,
  fair: CONDITION_META.fair.rank,
  acceptable: CONDITION_META.acceptable.rank,
};

export function isBookCondition(value: unknown): value is BookCondition {
  return typeof value === "string" && (BOOK_CONDITIONS as readonly string[]).includes(value);
}

/** SQL `case` snippet order used for condition sorting. */
export const CONDITION_SQL_ORDER = BOOK_CONDITIONS;

export const LISTING_STATUSES = ["active", "sold", "removed"] as const;
export type BookStatus = (typeof LISTING_STATUSES)[number];

export const ORDER_STATUSES = ["pending", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; badgeClass: string; description: string }
> = {
  pending: {
    label: "Pending",
    badgeClass: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
    description: "Paid and awaiting the seller to post the parcel.",
  },
  shipped: {
    label: "Shipped",
    badgeClass: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
    description: "The seller has posted the parcel.",
  },
  delivered: {
    label: "Delivered",
    badgeClass: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
    description: "Arrived. You can now review the seller.",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-rose-100 text-rose-900 ring-1 ring-rose-300",
    description: "The order was cancelled and refunded.",
  },
};

/** Escalating status colours: Sold/Delivered #10B981, Pending/Shipped #F59E0B, Cancelled #F5484B */
export const STATUS_HEX: Record<OrderStatus | "sold", string> = {
  sold: "#10B981",
  delivered: "#10B981",
  pending: "#F59E0B",
  shipped: "#F59E0B",
  cancelled: "#F5484B",
};
