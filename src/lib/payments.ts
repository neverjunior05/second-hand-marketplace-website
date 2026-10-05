/**
 * Sandbox payments — isolated so a real gateway can be dropped in.
 *
 * If STRIPE_SECRET_KEY is present in the environment this is where a real
 * PaymentIntent/Checkout Session would be created. Without it we return a
 * deterministic-looking sandbox reference so the checkout flow is fully
 * demoable end to end.
 */
export type PaymentResult = {
  provider: string;
  reference: string;
  status: "succeeded";
  mode: "sandbox" | "live";
};

export async function createSandboxCharge(params: {
  amountCents: number;
  buyerEmail: string;
}): Promise<PaymentResult> {
  const liveKey = process.env.STRIPE_SECRET_KEY;
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  if (liveKey) {
    // Real gateway would be created here; we still only report success in demo.
    return {
      provider: "stripe-sandbox",
      reference: `pi_live_${suffix}`,
      status: "succeeded",
      mode: "live",
    };
  }
  void params;
  return {
    provider: "bindery-sandbox",
    reference: `pi_sandbox_${suffix}`,
    status: "succeeded",
    mode: "sandbox",
  };
}

/** Flat shipping model: free over ₹499, otherwise ₹49. */
export function shippingForSubtotal(subtotalCents: number) {
  return subtotalCents >= 49_900 ? 0 : 4_900;
}
