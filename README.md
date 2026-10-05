# Bindery — secondhand books from people, not warehouses

A full-stack marketplace where individual sellers list used books and buyers browse, filter, buy and review the **seller** (not the book). One account buys *and* sells; only `admin` is an elevated role.

> Built on Next.js (App Router) route handlers as the REST API layer, PostgreSQL + Drizzle ORM for storage, JWT-in-httpOnly-cookie auth with bcrypt, and React Context for auth/cart state. The original brief specified Express + Mongoose — the same layered architecture is preserved here (models → queries/controllers → routes), just on the runtime this sandbox provides.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 (Next.js App Router), React Context (auth + cart), Axios service modules, Tailwind CSS v4 |
| Routing | File-system routes (`src/app`), server components for read paths, client components for mutations |
| API | Next.js route handlers under `src/app/api/**` (same REST surface as an Express router) |
| Database | PostgreSQL via Drizzle ORM (`src/db/schema.ts`) |
| Auth | JWT (`jose`) in an httpOnly cookie + `bcryptjs` hashing, role middleware (`requireUser`, `requireAdmin`) |
| Uploads | Route-handler upload endpoint (multer-equivalent): MIME allow-list + magic-byte sniffing + 5 MB cap |
| Payments | Sandbox gateway (`src/lib/payments.ts`) — swap in Stripe/Razorpay by editing one file |
| ISBN lookup | Google Books → Open Library fallback (`src/lib/isbn.ts`), free, no key required |

## Folder structure

```
project-root/
├── src/
│   ├── app/
│   │   ├── api/                    # REST API (controllers + routes)
│   │   │   ├── auth/{signup,login,logout,me}/route.ts
│   │   │   ├── books/route.ts      # browse/search/filter + create
│   │   │   ├── books/[id]/route.ts # detail, owner-scoped edit, soft delete
│   │   │   ├── books/lookup/route.ts   # ISBN metadata lookup
│   │   │   ├── cart/route.ts + cart/[id]/route.ts
│   │   │   ├── orders/route.ts + orders/[id]/route.ts + orders/sales/route.ts
│   │   │   ├── reviews/route.ts    # verified-purchase seller reviews
│   │   │   ├── users/[id]/route.ts # public seller profile
│   │   │   ├── wishlist/route.ts
│   │   │   ├── uploads/route.ts + uploads/[file]/route.ts
│   │   │   ├── admin/{stats,genres}/route.ts
│   │   │   ├── seed/route.ts
│   │   │   └── health/route.ts
│   │   ├── page.tsx                # browse / search / filter
│   │   ├── books/[id]/page.tsx     # listing detail (condition trust block)
│   │   ├── sellers/[id]/page.tsx   # seller profile + rating
│   │   ├── sell/page.tsx           # list a book (ISBN auto-fill)
│   │   ├── listings/               # "My listings" + edit
│   │   ├── cart/ orders/ wishlist/ # buyer & seller flows
│   │   ├── login/ signup/ admin/
│   │   ├── layout.tsx  globals.css # Fraunces + Inter, cream/emerald/terracotta palette
│   ├── components/                 # Navbar, BookCard, ConditionBadge, Rating, ListingForm…
│   ├── context/                    # AuthContext + CartContext (Context API)
│   ├── services/                   # Axios API modules (index.ts) + axios client (api.ts)
│   ├── lib/                        # auth, conditions enum, queries, isbn, payments, format, api
│   └── db/                         # schema.ts, seed.ts, seed-cli.ts, seedData.ts, index.ts
├── uploads/                        # runtime image store (served via /api/uploads/:file)
├── drizzle.config.json
├── .env.example
└── README.md
```

## Setup

```bash
cp .env.example .env          # then edit DATABASE_URL / JWT_SECRET
npm install

npx drizzle-kit push          # create tables from src/db/schema.ts
npm run seed                  # clear + repopulate sample data
npm run dev                   # http://localhost:3000
```

Production: `npm run build && npm run start`.

### Seed accounts (password shown)

| Email | Password | Purpose |
|---|---|---|
| `admin@bindery.test` | `Admin@123` | Admin — moderation, stats, genres |
| `priya@bindery.test` | `Password@123` | Seller with reviews + delivered orders |
| `devika@bindery.test` | `Password@123` | Fantasy seller, 4-star review history |
| `arjun@bindery.test` | `Password@123` | Textbook seller, honest "Acceptable" grades |
| `sara@bindery.test` | `Password@123` | Children's books |
| `rahul@bindery.test` | `Password@123` | Buyer demo (wishlist + order history) |

`npm run seed` truncates every table (restart identity) and repopulates: **6 accounts, 6 genres, 20 listings across 6 genres, 3 orders (2 delivered + 1 shipped) and 2 verified reviews** so seller ratings render immediately.

---

## API documentation

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Create account (buyer + seller in one), sets JWT cookie |
| POST | `/api/auth/login` | — | bcrypt verify, sets JWT cookie |
| POST | `/api/auth/logout` | user | Clears the cookie |
| GET | `/api/auth/me` | — | Current session or `null` |
| GET | `/api/books` | — | Browse/search: `q, genre, condition (repeatable), min, max, sort, sellerId, status, limit, offset` |
| POST | `/api/books` | user | Create listing (validates condition enum + required flaw notes) |
| GET | `/api/books/:id` | — | Listing + seller stats + recent seller reviews |
| PATCH | `/api/books/:id` | **owner** or admin | Edit price/condition/notes/qty/status (mark sold, re-list) |
| DELETE | `/api/books/:id` | **owner** or admin | Soft delete → `removed` (order history keeps its snapshot) |
| GET | `/api/books/lookup?isbn=` | — | Optional ISBN auto-fill (Google Books → Open Library) |
| GET | `/api/cart` | user | Cart lines with live totals |
| POST | `/api/cart` | user | Add listing (blocks own listings / sold copies) |
| PATCH | `/api/cart/:id` | user | Change quantity (`0` removes) |
| DELETE | `/api/cart/:id` · `/api/cart` | user | Remove line · empty cart |
| POST | `/api/orders` | user | **Checkout**: sandbox charge, atomic stock decrement, auto-mark sold |
| GET | `/api/orders` | user | Buyer order history + line snapshots |
| GET | `/api/orders/sales` | user | Seller sales history + settled earnings |
| PATCH | `/api/orders/:id` | buyer/seller/admin | `pending → shipped → delivered`; buyer may cancel while pending |
| GET | `/api/orders/:id` | participant | Order detail |
| GET | `/api/reviews?sellerId=` | — | Seller reviews + aggregate rating |
| POST | `/api/reviews` | verified buyer | Review a seller for a **delivered** order (server-enforced, once per order+seller) |
| GET | `/api/wishlist` · POST · DELETE | user | Save/remove for later (POST toggles) |
| GET | `/api/users/:id` | — | Public seller profile: listings, stats, reviews |
| POST | `/api/uploads` | user | Image upload (JPG/PNG/WEBP, ≤5 MB, magic-byte checked) |
| GET | `/api/uploads/:file` | — | Serve a validated upload |
| GET | `/api/admin/stats` | admin | Platform totals + recent listings |
| PATCH | `/api/admin/stats` | admin | Moderate: `remove` / `reinstate` a listing (+ note) |
| POST | `/api/admin/stats` | admin | Create a genre |
| DELETE | `/api/admin/stats?genreId=` | admin | Delete an unused genre |
| GET | `/api/admin/genres` | admin | Genres with active counts |
| POST | `/api/seed` | open when empty, admin after | Re-run the seed |
| GET | `/api/health` | — | Health probe |

Ownership is the gate, not a "seller" role: every protected listing/order mutation checks `resource.sellerId === session.id` (admins bypass).

---

## Database schema

| Table | Key columns |
|---|---|
| **users** | `id, name, email (unique), password_hash, role ('user' \| 'admin'), city, bio, accent, created_at` |
| **genres** | `id, name, slug (unique), description` |
| **books** | `id, seller_id → users, genre_id → genres, title, author, isbn, condition (enum), condition_notes (required), description, price_cents, original_price_cents, quantity, cover_image, cover_image_2, status ('active' \| 'sold' \| 'removed'), admin_note, published_year, metadata_source, created_at, sold_at` |
| **cart_items** | `id, user_id, book_id, quantity` — unique per (user, book) |
| **orders** | `id, buyer_id, status ('pending' \| 'shipped' \| 'delivered' \| 'cancelled'), subtotal_cents, shipping_cents, total_cents, shipping_* , payment_provider, payment_ref, created_at, updated_at` |
| **order_items** | `id, order_id, book_id, seller_id, title, author, condition, cover_image, unit_price_cents, quantity, reviewed` — the receipt snapshot |
| **reviews** | `id, seller_id, buyer_id, order_id, rating (1–5), comment` — unique per (order, buyer, seller) |
| **wishlist_items** | `id, user_id, book_id` — unique per (user, book) |

Money is stored in integer **paise/cents** to avoid float drift.

## Why condition is an enum, not free text

`book_condition` is a closed, ordered enum — `new → like_new → good → fair → acceptable`. Every grade carries a fixed buyer-facing definition, typical flaws and a badge colour (`src/lib/conditions.ts`). This buys three things:

1. **Filtering/sorting is real.** "Sort by condition: best first" is a deterministic `CASE` over enum ranks, not a guess at what a seller meant.
2. **"Good" means one thing.** Sellers can't inflate; the platform explains the grade for them, and they *add* specifics in the required `condition_notes` field (min 10 chars) — e.g. "highlighting on chapters 3–5".
3. **Colour escalates without alarming.** New/Like New are emerald, Good is amber, Fair/Acceptable are muted gray-amber. Never red — an acceptable-but-readable copy is not a defect.

## Business logic worth reading

- **Auto-sold-on-purchase** — `POST /api/orders` runs one transaction; each line is decremented with a guarded atomic `UPDATE … WHERE status='active' AND quantity >= n`, and when quantity reaches 0 the listing flips to `status='sold'` with `sold_at`. Browse queries filter `status='active'`, so the copy vanishes from search instantly yet stays reachable by direct link and order history. `order_items` snapshots title/condition/price so later edits can't rewrite receipts.
- **Seller rating aggregation** — `getSellerStats()` computes `ROUND(AVG(reviews.rating), 1)` in SQL (never cached, never stale), and the same mean is attached to every card via a correlated subquery, so the trust signal appears before a buyer clicks through.
- **Review eligibility** — enforced server-side in `POST /api/reviews`: order must belong to the buyer, contain an item from that seller, and be `delivered`; one review per (order, buyer, seller) via a unique index.

## Screenshots

| Page | Placeholder |
|---|---|
| Browse + filters | `_screenshots/browse.png` |
| Book detail (condition block) | `_screenshots/book-detail.png` |
| List a book (ISBN lookup) | `_screenshots/sell.png` |
| Cart + sandbox checkout | `_screenshots/cart.png` |
| Orders (buyer + seller tabs, review box) | `_screenshots/orders.png` |
| Admin stats & moderation | `_screenshots/admin.png` |

## Future improvements

- Add ISBN **barcode scanning** via the device camera in the listing form.
- Add an **offer/negotiation** feature — buyer proposes a lower price, seller accepts or counters.
- Add **shipping cost estimation** by parcel weight and distance instead of the flat ₹49 rule.
- Add a **book-swap/trade** option alongside straight purchase.
- Push notifications when a wishlisted title is listed, and saved-search alerts.
- In-app messaging between buyer and seller before checkout.
- Real Stripe/Razorpay live mode with refunds and partial cancellations.
- Multi-copy consignment support for small secondhand shops.
