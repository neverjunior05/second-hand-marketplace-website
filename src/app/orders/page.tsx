"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AppProviders";
import { apiError } from "@/services/api";
import { ordersService, reviewsService, type OrderStatusDto } from "@/services";
import { ORDER_STATUS_META } from "@/lib/conditions";
import { formatDate, formatPrice } from "@/lib/format";

type Purchase = Awaited<ReturnType<typeof ordersService.mine>>["orders"][number];
type Sale = Awaited<ReturnType<typeof ordersService.sales>>["sales"][number];

const statusBadge: Record<OrderStatusDto, string> = {
  pending: "bg-[#F59E0B]/15 text-[#92610b] ring-1 ring-[#F59E0B]/40",
  shipped: "bg-[#F59E0B]/15 text-[#92610b] ring-1 ring-[#F59E0B]/40",
  delivered: "bg-[#10B981]/15 text-[#0b6b4f] ring-1 ring-[#10B981]/40",
  cancelled: "bg-[#F5484B]/10 text-[#a32629] ring-1 ring-[#F5484B]/40",
};

function ReviewBox({ orderId, sellerId, onDone }: { orderId: number; sellerId: number; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await reviewsService.add({ orderId, sellerId, rating, comment });
      onDone();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-xl bg-cream p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Review this seller &amp; the transaction</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`text-xl ${value <= rating ? "text-[#F59E0B]" : "text-hairline"}`}
            aria-label={`${value} star`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="input mt-2 min-h-20"
        placeholder="Was the condition as described? How was the packing and posting time?"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        required
        minLength={10}
      />
      {error ? <p className="mt-1 text-xs text-[#F5484B]">{error}</p> : null}
      <button className="btn btn-secondary mt-2" disabled={busy}>
        {busy ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}

function OrdersPageInner() {
  const { user, loading } = useAuth();
  const params = useSearchParams();
  const justPlaced = params.get("placed");
  const [tab, setTab] = useState<"purchases" | "sales">("purchases");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [mine, salesData] = await Promise.all([ordersService.mine(), ordersService.sales()]);
    setPurchases(mine.orders);
    setSales(salesData.sales);
    setEarnings(salesData.earningsCents);
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function setStatus(orderId: number, status: OrderStatusDto) {
    try {
      await ordersService.updateStatus(orderId, status);
      setMessage(`Order #${orderId} → ${ORDER_STATUS_META[status].label}.`);
      await load();
    } catch (err) {
      setMessage(apiError(err));
    }
  }

  if (loading) return <p className="py-10 text-center text-ink-soft">Loading orders…</p>;

  if (!user) {
    return (
      <div className="card p-10 text-center">
        <h1 className="font-display text-2xl">Sign in to see your orders</h1>
        <Link href="/login" className="btn btn-primary mt-4">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {justPlaced ? (
        <div className="rounded-xl bg-[#10B981]/15 px-4 py-3 text-sm text-[#0b6b4f]">
          Order #{justPlaced} placed. Payment captured in sandbox mode and the copies are already marked sold.
        </div>
      ) : null}
      {message ? <p className="rounded-xl bg-brand-soft px-4 py-2 text-sm text-brand">{message}</p> : null}

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Orders</h1>
          <p className="mt-1 text-sm text-ink-soft">You are both buyer and seller — switch between the two sides.</p>
        </div>
        <div className="flex gap-2">
          <button
            className={`btn ${tab === "purchases" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("purchases")}
          >
            Purchases ({purchases.length})
          </button>
          <button className={`btn ${tab === "sales" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("sales")}>
            Sales ({sales.length})
          </button>
        </div>
      </header>

      {tab === "sales" ? (
        <p className="card p-4 text-sm">
          Settled earnings from delivered orders: <strong>{formatPrice(earnings)}</strong>
        </p>
      ) : null}

      {tab === "purchases" ? (
        purchases.length === 0 ? (
          <div className="card p-10 text-center">
            <h2 className="font-display text-xl">No purchases yet</h2>
            <Link href="/" className="btn btn-primary mt-4">
              Find a book
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {purchases.map((order) => (
              <li key={order.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-lg">Order #{order.id}</p>
                    <p className="text-xs text-ink-soft">
                      {formatDate(order.createdAt)} · ref {order.paymentRef} · {order.shippingCity}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[order.status]}`}>
                    {ORDER_STATUS_META[order.status].label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">{ORDER_STATUS_META[order.status].description}</p>

                <ul className="mt-3 grid gap-2">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream p-3">
                      <div>
                        <p className="font-medium">
                          {item.title} <span className="text-ink-soft">× {item.quantity}</span>
                        </p>
                        <p className="text-xs text-ink-soft">
                          {item.author} · sold by{" "}
                          <Link href={`/sellers/${item.sellerId}`} className="underline">
                            seller #{item.sellerId}
                          </Link>
                        </p>
                      </div>
                      <p className="text-sm">{formatPrice(item.unitPriceCents * item.quantity)}</p>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
                  <p className="text-sm">
                    Total <strong>{formatPrice(order.totalCents)}</strong>{" "}
                    <span className="text-xs text-ink-soft">
                      (incl. {formatPrice(order.shippingCents)} shipping)
                    </span>
                  </p>
                  {order.status === "pending" ? (
                    <button className="btn btn-ghost text-[#F5484B]" onClick={() => void setStatus(order.id, "cancelled")}>
                      Cancel order
                    </button>
                  ) : null}
                </div>

                {order.status === "delivered" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[...new Set(order.items.map((item) => item.sellerId))].map((sellerId) => {
                      const lines = order.items.filter((item) => item.sellerId === sellerId);
                      const reviewed = lines.every((line) => line.reviewed === 1);
                      return reviewed ? (
                        <p key={sellerId} className="rounded-xl bg-brand-soft p-3 text-sm text-brand">
                          You already reviewed this seller for this order. Thank you!
                        </p>
                      ) : (
                        <ReviewBox key={sellerId} orderId={order.id} sellerId={sellerId} onDone={load} />
                      );
                    })}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : sales.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="font-display text-xl">No sales yet</h2>
          <Link href="/sell" className="btn btn-primary mt-4">
            List a book
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {sales.map((sale) => (
            <li key={sale.orderId} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-lg">Order #{sale.orderId}</p>
                  <p className="text-xs text-ink-soft">
                    {sale.buyerName} · {sale.buyerCity ?? "—"} · {formatDate(sale.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[sale.status]}`}>
                    {ORDER_STATUS_META[sale.status].label}
                  </span>
                  <span className="text-sm font-semibold">{formatPrice(sale.earningsCents)}</span>
                </div>
              </div>

              <p className="mt-2 text-xs text-ink-soft">
                Ship to: {sale.shippingName}, {sale.shippingAddress}, {sale.shippingCity} {sale.shippingPostal}
              </p>

              <ul className="mt-3 grid gap-2">
                {sale.items.map((item) => (
                  <li key={item.itemId} className="flex items-center justify-between gap-2 rounded-xl bg-cream p-3 text-sm">
                    <span>
                      {item.title} × {item.quantity}
                    </span>
                    <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap gap-2">
                {sale.status === "pending" ? (
                  <button className="btn btn-primary" onClick={() => void setStatus(sale.orderId, "shipped")}>
                    Mark shipped
                  </button>
                ) : null}
                {sale.status === "shipped" ? (
                  <button className="btn btn-primary" onClick={() => void setStatus(sale.orderId, "delivered")}>
                    Mark delivered
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-ink-soft">Loading…</p>}>
      <OrdersPageInner />
    </Suspense>
  );
}
