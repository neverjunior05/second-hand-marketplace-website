"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, useCart } from "@/context/AppProviders";
import { apiError } from "@/services/api";
import { wishlistService } from "@/services";

export function AddToCartButton({
  bookId,
  disabled,
  ownListing,
  quantity,
}: {
  bookId: number;
  disabled?: boolean;
  ownListing?: boolean;
  quantity: number;
}) {
  const { user } = useAuth();
  const { add } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const soldOut = disabled || quantity <= 0;

  async function handleAdd() {
    setError(null);
    setBusy(true);
    try {
      await add(bookId, 1);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (ownListing) {
    return (
      <button className="btn btn-ghost w-full" disabled>
        This is your listing
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button className="btn btn-primary w-full" onClick={handleAdd} disabled={busy || soldOut || done}>
        {soldOut ? "Sold out" : done ? "In your cart ✓" : busy ? "Adding…" : "Add to cart"}
      </button>
      {!user && !soldOut ? (
        <p className="text-xs text-ink-soft">
          You&apos;ll be asked to{" "}
          <button className="underline" onClick={() => router.push("/login")}>
            sign in
          </button>{" "}
          at checkout.
        </p>
      ) : null}
      {error ? <p className="text-xs text-[#F5484B]">{error}</p> : null}
    </div>
  );
}

export function SaveForLaterButton({ bookId, initialSaved = false }: { bookId: number; initialSaved?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const result = await wishlistService.toggle(bookId);
      setSaved(result.saved);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn-ghost w-full" onClick={toggle} disabled={busy}>
      {saved ? "★ Saved for later" : "☆ Save for later"}
    </button>
  );
}
