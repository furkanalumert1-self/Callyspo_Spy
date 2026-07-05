import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined };

function createStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder_build_time", {
    apiVersion: "2025-02-24.acacia",
  });
}

/**
 * Lazily instantiated so `next build` (which loads route modules without
 * runtime env vars present) doesn't crash on the Stripe SDK's eager apiKey
 * validation. Real requests always run with STRIPE_SECRET_KEY set.
 */
function getStripeClient(): Stripe {
  if (!globalForStripe.stripe) {
    globalForStripe.stripe = createStripeClient();
  }
  return globalForStripe.stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripeClient(), prop, receiver);
  },
});
