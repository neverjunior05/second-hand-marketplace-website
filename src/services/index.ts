import { api } from "./api";
import type { BookCondition } from "@/lib/conditions";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  city: string | null;
};

export type BookCardDto = {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  condition: BookCondition;
  conditionNotes: string;
  description: string;
  priceCents: number;
  originalPriceCents: number | null;
  quantity: number;
  coverImage: string | null;
  coverImage2: string | null;
  status: "active" | "sold" | "removed";
  /** ISO string over the wire, Date when queried on the server. */
  createdAt: string | Date;
  soldAt: string | Date | null;
  genreId: number;
  genreName: string;
  genreSlug: string;
  publishedYear: number | null;
  sellerId: number;
  sellerName: string;
  sellerCity: string | null;
  sellerRating: number | null;
  sellerReviewCount: number;
};

export const auth = {
  me: async () => (await api.get<{ user: SessionUser | null }>("/auth/me")).data.user,
  signup: async (payload: { name: string; email: string; password: string; city?: string }) =>
    (await api.post<{ user: SessionUser }>("/auth/signup", payload)).data.user,
  login: async (payload: { email: string; password: string }) =>
    (await api.post<{ user: SessionUser }>("/auth/login", payload)).data.user,
  logout: async () => {
    await api.post("/auth/logout");
  },
};

export const booksService = {
  browse: async (params: Record<string, string | number | undefined>) =>
    (await api.get<{ books: BookCardDto[]; total: number }>("/books", { params })).data,
  get: async (id: number) =>
    (
      await api.get<{
        book: BookCardDto;
        seller: { averageRating: number | null; reviewCount: number };
        sellerReviews: Array<{ id: number; rating: number; comment: string; buyerName: string; createdAt: string }>;
      }>(`/books/${id}`)
    ).data,
  create: async (payload: Record<string, unknown>) => (await api.post<{ book: { id: number } }>("/books", payload)).data,
  update: async (id: number, payload: Record<string, unknown>) =>
    (await api.patch<{ book: { id: number } }>(`/books/${id}`, payload)).data,
  remove: async (id: number) => api.delete(`/books/${id}`),
  mine: async (id: number) => (await api.get<{ book: BookCardDto }>(`/books/${id}`)).data.book,
  lookup: async (isbn: string) =>
    (
      await api.get<{
        found: boolean;
        message?: string;
        metadata?: {
          source: string;
          title: string;
          author: string;
          description: string | null;
          publishedYear: number | null;
          coverImage: string | null;
        };
      }>("/books/lookup", { params: { isbn } })
    ).data,
};

export const cartService = {
  get: async () =>
    (
      await api.get<{
        items: Array<{
          id: number;
          quantity: number;
          bookId: number;
          title: string;
          author: string;
          priceCents: number;
          condition: BookCondition;
          conditionNotes: string;
          coverImage: string | null;
          status: string;
          available: number;
          sellerId: number;
          sellerName: string;
          genreName: string;
          blocked: boolean;
          ownListing: boolean;
        }>;
        subtotalCents: number;
        shippingCents: number;
        totalCents: number;
      }>("/cart")
    ).data,
  add: async (bookId: number, quantity = 1) => (await api.post<{ cartCount: number }>("/cart", { bookId, quantity })).data,
  update: async (id: number, quantity: number) => api.patch(`/cart/${id}`, { quantity }),
  remove: async (id: number) => api.delete(`/cart/${id}`),
  clear: async () => api.delete("/cart"),
};

export type OrderStatusDto = "pending" | "shipped" | "delivered" | "cancelled";

export const ordersService = {
  mine: async () =>
    (
      await api.get<{
        orders: Array<{
          id: number;
          status: OrderStatusDto;
          totalCents: number;
          subtotalCents: number;
          shippingCents: number;
          createdAt: string;
          paymentRef: string;
          shippingName: string;
          shippingAddress: string;
          shippingCity: string;
          shippingPostal: string;
          items: Array<{
            id: number;
            bookId: number | null;
            sellerId: number;
            title: string;
            author: string;
            condition: BookCondition;
            coverImage: string | null;
            unitPriceCents: number;
            quantity: number;
            reviewed: number;
          }>;
        }>;
      }>("/orders")
    ).data,
  sales: async () =>
    (
      await api.get<{
        sales: Array<{
          orderId: number;
          status: OrderStatusDto;
          createdAt: string;
          buyerName: string;
          buyerCity: string | null;
          shippingName: string;
          shippingAddress: string;
          shippingCity: string;
          shippingPostal: string;
          earningsCents: number;
          items: Array<{
            itemId: number;
            title: string;
            author: string;
            condition: BookCondition;
            coverImage: string | null;
            quantity: number;
            unitPriceCents: number;
            reviewed: number;
          }>;
        }>;
        earningsCents: number;
        pendingCount: number;
      }>("/orders/sales")
    ).data,
  updateStatus: async (orderId: number, status: OrderStatusDto) =>
    (await api.patch<{ order: { id: number; status: OrderStatusDto } }>(`/orders/${orderId}`, { status })).data,
  checkout: async (payload: Record<string, string>) =>
    (await api.post<{ orderId: number; totalCents: number; payment: { reference: string; provider: string } }>("/orders", payload))
      .data,
};

export const reviewsService = {
  forSeller: async (sellerId: number) =>
    (await api.get<{ reviews: Array<{ id: number; rating: number; comment: string; buyerName: string; createdAt: string }> }>("/reviews", {
      params: { sellerId },
    })).data,
  add: async (payload: { orderId: number; sellerId: number; rating: number; comment: string }) =>
    (await api.post<{ averageRating: number | null; reviewCount: number }>("/reviews", payload)).data,
};

export const wishlistService = {
  list: async () =>
    (
      await api.get<{
        items: Array<{
          id: number;
          bookId: number;
          title: string;
          author: string;
          priceCents: number;
          condition: BookCondition;
          coverImage: string | null;
          status: string;
          genreName: string;
          sellerName: string;
        }>;
      }>("/wishlist")
    ).data,
  toggle: async (bookId: number) => (await api.post<{ saved: boolean }>("/wishlist", { bookId })).data,
  remove: async (bookId: number) => api.delete(`/wishlist?bookId=${bookId}`),
};

export const adminService = {
  stats: async () =>
    (
      await api.get<{
        totals: {
          users: number;
          listings: number;
          activeListings: number;
          soldListings: number;
          removedListings: number;
          reviews: number;
          completedOrders: number;
          openOrders: number;
          revenueCents: number;
        };
        recentListings: Array<{
          id: number;
          title: string;
          author: string;
          status: "active" | "sold" | "removed";
          condition: BookCondition;
          priceCents: number;
          createdAt: string;
          sellerName: string;
          sellerId: number;
          adminNote: string | null;
        }>;
      }>("/admin/stats")
    ).data,
  moderate: async (bookId: number, action: "remove" | "reinstate", note?: string) =>
    api.patch("/admin/stats", { bookId, action, note }),
  addGenre: async (name: string, description: string) => api.post("/admin/stats", { name, description }),
  deleteGenre: async (genreId: number) => api.delete(`/admin/stats?genreId=${genreId}`),
};

export const uploadService = {
  image: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (
      await api.post<{ url: string }>("/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },
};
