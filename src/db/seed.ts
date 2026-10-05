/**
 * Seed script: clears every table and repopulates the marketplace so the app
 * looks realistic immediately after setup. Run with `npm run seed`.
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { books, cartItems, genres, orderItems, orders, reviews, users, wishlistItems } from "./schema";
import { bookSeed, cover, genreSeed, orderSeed, userSeed } from "./seedData";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function runSeed() {
  // --- 1. clear (FK-safe order, restarting identities so ids stay predictable)
  await db.execute(sql`TRUNCATE TABLE ${reviews}, ${orderItems}, ${orders}, ${cartItems}, ${wishlistItems}, ${books}, ${genres}, ${users} RESTART IDENTITY CASCADE`);

  // --- 2. genres
  const insertedGenres = await db
    .insert(genres)
    .values(
      genreSeed.map((g) => ({
        name: g.name,
        slug: slugify(g.name),
        description: g.description,
      })),
    )
    .returning();
  const genreBySlug = new Map(insertedGenres.map((g) => [g.slug, g.id]));

  // --- 3. users (bcrypt hashed, cost 10)
  const insertedUsers = await db
    .insert(users)
    .values(
      await Promise.all(
        userSeed.map(async (u) => ({
          name: u.name,
          email: u.email.toLowerCase(),
          passwordHash: await bcrypt.hash(u.password, 10),
          role: u.role,
          city: u.city,
          bio: u.bio,
          accent: u.accent,
        })),
      ),
    )
    .returning();
  const userByEmail = new Map(insertedUsers.map((u) => [u.email, u]));

  // --- 4. book listings
  const insertedBooks = await db
    .insert(books)
    .values(
      bookSeed.map((b) => {
        const seller = userByEmail.get(b.sellerEmail);
        const genreId = genreBySlug.get(slugify(genreSeed.find((g) => g.slug === b.genreSlug)?.name ?? b.genreSlug));
        if (!seller || !genreId) throw new Error(`Seed error for ${b.title}`);
        return {
          sellerId: seller.id,
          genreId,
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          condition: b.condition,
          conditionNotes: b.conditionNotes,
          description: b.description,
          priceCents: Math.round(b.price * 100),
          originalPriceCents: Math.round(b.originalPrice * 100),
          quantity: b.quantity ?? 1,
          coverImage: cover(b.coverSeed, 1),
          coverImage2: cover(b.coverSeed, 2),
          status: "active" as const,
          publishedYear: b.publishedYear,
          metadataSource: "seed",
        };
      }),
    )
    .returning();

  const shippingCents = 4_900;

  // --- 5. demo orders (some delivered → these power seller ratings)
  let orderSeq = 1000;
  for (const o of orderSeed) {
    const buyer = userByEmail.get(o.buyerEmail);
    if (!buyer) continue;
    const lineItems = o.items.map((item) => {
      const seller = userByEmail.get(item.sellerEmail);
      const book = insertedBooks.find((b) => b.title === item.title && b.sellerId === seller?.id);
      return { item, seller, book };
    });
    const subtotal = lineItems.reduce((sum, li) => sum + li.item.price * 100, 0);
    orderSeq += 1;
    const createdAt = new Date(Date.now() - o.daysAgo * 86_400_000);

    const [order] = await db
      .insert(orders)
      .values({
        id: orderSeq,
        buyerId: buyer.id,
        status: o.status,
        subtotalCents: subtotal,
        shippingCents,
        totalCents: subtotal + shippingCents,
        shippingName: buyer.name,
        shippingAddress: `${14 + buyer.id} Jor Bagh Lane, Flat 3B`,
        shippingCity: buyer.city ?? "Delhi",
        shippingPostal: "110003",
        shippingPhone: "+91 98••• ••4•",
        paymentProvider: "bindery-sandbox",
        paymentRef: `pi_sandbox_S${orderSeq}${buyer.id}`,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await db.insert(orderItems).values(
      lineItems.map(({ item, seller, book }) => {
        // Mark the purchased listing as sold so search results stay honest.
        if (book) {
          void db
            .update(books)
            .set({ status: "sold", quantity: 0, soldAt: createdAt })
            .where(sql`${books.id} = ${book.id}`);
        }
        return {
          orderId: order.id,
          bookId: book?.id ?? null,
          sellerId: seller!.id,
          title: item.title,
          author: item.author,
          condition: item.condition,
          coverImage: cover(item.coverSeed, 1),
          unitPriceCents: item.price * 100,
          quantity: 1,
          reviewed: 0,
        };
      }),
    );

    if (o.reviews.length > 0) {
      await db.insert(reviews).values(
        o.reviews.map((r) => {
          const seller = userByEmail.get(r.sellerEmail)!;
          return {
            sellerId: seller.id,
            buyerId: buyer.id,
            orderId: order.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: new Date(createdAt.getTime() + 86_400_000),
          };
        }),
      );
    }
  }

  // --- 6. a small wishlist for the demo buyer
  const rahul = userByEmail.get("rahul@bindery.test");
  const wishlistBook = insertedBooks.find((b) => b.title === "The Left Hand of Darkness");
  if (rahul && wishlistBook) {
    await db.insert(wishlistItems).values({ userId: rahul.id, bookId: wishlistBook.id });
  }

  return {
    users: insertedUsers.length,
    genres: insertedGenres.length,
    books: insertedBooks.length,
    orders: orderSeed.length,
  };
}


