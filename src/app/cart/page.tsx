"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConditionBadge } from "@/components/ConditionBadge";
import { useAuth, useCart } from "@/context/AppProviders";
import { apiError } from "@/services/api";
import { cartService, ordersService } from "@/services";
import { formatPrice } from "@/lib/format";

type CartData = Awaited<ReturnType<typeof cartService.get>>;

export default function CartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState({
    shippingName: "",
    shippingAddress: "",
    shippingCity: "",
    shippingPostal: "",
    shippingPhone: "",
  });

  const load = useCallback(async () => {
    try {
      setCart(await cartService.get());
    } catch {
      setCart(null);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    if (user) {
      setAddress((prev) => ({
        ...prev,
        shippingName: prev.shippingName || user.name,
        shippingCity: prev.shippingCity || user.city || "",
      }));
    }
  }, [user]);

  async function changeQuantity(id: number, quantity: number) {
    await cartService.update(id, quantity);
    await load();
  }

  async function checkout(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await ordersService.checkout(address);
      // Purchased single copies are auto-marked sold by the backend.
      router.push(`/orders?placed=${result.orderId}`);
      router.refresh();
    } catch (err) {
      setError(apiError(err, "Checkout failed."));
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="card p-10 text-center">
        <h1 className="font-display text-2xl">Sign in to see your cart</h1>
        <Link href="/login" className="btn btn-primary mt-4">
          Sign in
        </Link>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const blockers = items.filter((item) => item.blocked || item.ownListing);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl">Your cart</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Each line is a single physical copy from a different seller. When you pay, copies are reserved
          immediately and marked sold.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="font-display text-xl">Your cart is empty</h2>
          <Link href="/" className="btn btn-primary mt-4">
            Browse books
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className={`card flex gap-4 p-4 ${item.blocked ? "opacity-60" : ""}`}>
                <Link href={`/books/${item.bookId}`} className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-cream">
                  {item.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </Link>
                <div className="flex-1">
                  <ConditionBadge condition={item.condition} />
                  <Link href={`/books/${item.bookId}`} className="font-display text-lg hover:text-brand">
                    {item.title}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    {item.author} · sold by{" "}
                    <Link href={`/sellers/${item.sellerId}`} className="underline">
                      {item.sellerName}
                    </Link>
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">{item.conditionNotes}</p>
                  {item.ownListing ? (
                    <p className="mt-2 text-xs text-clay">You cannot buy your own listing.</p>
                  ) : item.blocked ? (
                    <p className="mt-2 text-xs text-[#F5484B]">Just sold — remove it to continue.</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end justify-between">
                  <p className="font-semibold">{formatPrice(item.priceCents * item.quantity)}</p>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-ghost px-3 py-1" onClick={() => void changeQuantity(item.id, item.quantity - 1)}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      className="btn btn-ghost px-3 py-1"
                      disabled={item.quantity >= item.available}
                      onClick={() => void changeQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                    <button className="btn btn-ghost px-3 py-1" onClick={async () => { await cartService.remove(item.id); await load(); }}>
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={checkout} className="card h-fit p-5">
            <h2 className="font-display text-xl">Delivery details</h2>
            <div className="mt-4 grid gap-3">
              {(
                [
                  ["shippingName", "Full name"],
                  ["shippingAddress", "Address"],
                  ["shippingCity", "City"],
                  ["shippingPostal", "Postal code"],
                  ["shippingPhone", "Phone (optional)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="label" htmlFor={key}>
                    {label}
                  </label>
                  <input
                    id={key}
                    className="input"
                    value={address[key]}
                    onChange={(event) => setAddress((prev) => ({ ...prev, [key]: event.target.value }))}
                    required={key !== "shippingPhone"}
                  />
                </div>
              ))}
            </div>

            <dl className="mt-5 flex flex-col gap-1 border-t border-hairline pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd>{formatPrice(cart?.subtotalCents ?? 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Shipping</dt>
                <dd>{cart?.shippingCents ? formatPrice(cart.shippingCents) : "Free"}</dd>
              </div>
              <div className="mt-1 flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(cart?.totalCents ?? 0)}</dd>
              </div>
            </dl>

            <p className="mt-4 rounded-xl bg-cream p-3 text-xs text-ink-soft">
              Sandbox payment — no real charge. Reference is generated at checkout
              {blockers.length > 0 ? ", but fix the flagged lines above first." : "."}
            </p>

            {error ? <p className="mt-3 text-sm text-[#F5484B]">{error}</p> : null}

            <button className="btn btn-primary mt-4 w-full" disabled={busy || blockers.length > 0}>
              {busy ? "Paying…" : `Pay ${formatPrice(cart?.totalCents ?? 0)}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
