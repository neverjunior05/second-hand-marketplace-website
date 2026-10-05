/**
 * Drizzle schema for Bindery (secondhand book marketplace).
 *
 * Domain models mirror the classic Mongoose models requested:
 *   User, Book, Order, Review  (+ CartItem, WishlistItem, Genre)
 *
 * Money is stored in **cents** (integer) so price math never drifts.
 * Book condition is a **fixed enum**, never free text — see src/lib/conditions.ts
 */
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

/** Elevated accounts only. Every normal account can buy AND sell. */
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

/**
 * The condition grading scale. Fixed + ordered by rank so that
 * filtering and sorting by condition is reliable platform-wide.
 */
export const bookConditionEnum = pgEnum("book_condition", [
  "new",
  "like_new",
  "good",
  "fair",
  "acceptable",
]);

/** Listing lifecycle. `sold` is set automatically on purchase. */
export const bookStatusEnum = pgEnum("book_status", [
  "active",
  "sold",
  "removed", // removed by seller OR pulled by an admin (see adminNote)
]);

/** Order status lifecycle: Pending → Shipped → Delivered */
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "shipped",
  "delivered",
  "cancelled",
]);

/* ------------------------------------------------------------------ users */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    city: varchar("city", { length: 120 }),
    bio: text("bio"),
    /** Deterministic avatar (initials + colour) — no image upload needed. */
    accent: varchar("accent", { length: 20 }).notNull().default("emerald"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

/* ----------------------------------------------------------------- genres */

export const genres = pgTable(
  "genres",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("genres_slug_unique").on(table.slug)],
);

/* ------------------------------------------------------------------ books */

export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    genreId: integer("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 240 }).notNull(),
    author: varchar("author", { length: 200 }).notNull(),
    isbn: varchar("isbn", { length: 20 }),
    /** Fixed enum grade — the platform's primary trust + filter signal. */
    condition: bookConditionEnum("condition").notNull(),
    /** Required free-text flaw detail that accompanies the grade. */
    conditionNotes: text("condition_notes").notNull(),
    description: text("description").notNull(),
    priceCents: integer("price_cents").notNull(),
    originalPriceCents: integer("original_price_cents"),
    /** Used books are almost always a single copy. */
    quantity: integer("quantity").notNull().default(1),
    coverImage: text("cover_image"),
    coverImage2: text("cover_image_2"),
    status: bookStatusEnum("status").notNull().default("active"),
    adminNote: text("admin_note"),
    /** Filled from the Open Library / Google Books lookup. */
    metadataSource: varchar("metadata_source", { length: 40 }),
    publishedYear: integer("published_year"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    soldAt: timestamp("sold_at", { withTimezone: true }),
  },
  (table) => [
    index("books_status_idx").on(table.status),
    index("books_seller_idx").on(table.sellerId),
    index("books_genre_idx").on(table.genreId),
    index("books_condition_idx").on(table.condition),
  ],
);

/* -------------------------------------------------------------- cart items */

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cart_user_book_unique").on(table.userId, table.bookId)],
);

/* ----------------------------------------------------------------- orders */

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull().default("pending"),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  shippingName: varchar("shipping_name", { length: 160 }).notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: varchar("shipping_city", { length: 120 }).notNull(),
  shippingPostal: varchar("shipping_postal", { length: 30 }).notNull(),
  shippingPhone: varchar("shipping_phone", { length: 40 }),
  paymentProvider: varchar("payment_provider", { length: 40 }).notNull().default("bindery-sandbox"),
  paymentRef: varchar("payment_ref", { length: 80 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Line items snapshot the listing at purchase time (price/condition can change). */
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    bookId: integer("book_id").references(() => books.id, { onDelete: "set null" }),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 240 }).notNull(),
    author: varchar("author", { length: 200 }).notNull(),
    condition: bookConditionEnum("condition").notNull(),
    coverImage: text("cover_image"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull().default(1),
    reviewed: integer("reviewed").notNull().default(0),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_seller_idx").on(table.sellerId),
  ],
);

/* ---------------------------------------------------------------- reviews */

/** Reviews are about the SELLER + transaction, never the book itself. */
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    buyerId: integer("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reviews_order_buyer_seller_unique").on(table.orderId, table.buyerId, table.sellerId),
    index("reviews_seller_idx").on(table.sellerId),
  ],
);

/* --------------------------------------------------------------- wishlist */

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("wishlist_user_book_unique").on(table.userId, table.bookId)],
);

/* -------------------------------------------------------------- relations */

export const usersRelations = relations(users, ({ many }) => ({
  books: many(books),
  reviewsReceived: many(reviews),
}));

export const booksRelations = relations(books, ({ one }) => ({
  seller: one(users, { fields: [books.sellerId], references: [users.id] }),
  genre: one(genres, { fields: [books.genreId], references: [genres.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  items: many(orderItems),
}));

export type User = typeof users.$inferSelect;
export type Book = typeof books.$inferSelect;
export type Genre = typeof genres.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Review = typeof reviews.$inferSelect;
