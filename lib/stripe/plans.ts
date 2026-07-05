export type PlanId = "free" | "starter" | "pro";

export interface PlanConfig {
  id: PlanId;
  name: string;
  priceMonthly: number;
  stripePriceId?: string;
  searchQuota: number;
  maxAdsPerSearch: number;
  features: string[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    searchQuota: 5,
    maxAdsPerSearch: 5,
    features: ["Ayda 5 arama", "Arama başına ilk 5 reklam işlenir"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthly: 29,
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
    searchQuota: 50,
    maxAdsPerSearch: 10,
    features: ["Ayda 50 arama", "Arama başına ilk 10 reklam işlenir", "E-posta bildirimi"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 79,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    searchQuota: 200,
    maxAdsPerSearch: 20,
    features: ["Ayda 200 arama", "Arama başına ilk 20 reklam işlenir", "Öncelikli işleme", "E-posta bildirimi"],
  },
};

export function getPlan(planId: string | null | undefined): PlanConfig {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.free;
}

export function getPlanIdByStripePriceId(priceId: string): PlanId | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === priceId) return plan.id;
  }
  return null;
}
