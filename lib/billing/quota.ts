import { prisma } from "@/lib/db/prisma";
import { getPlan } from "@/lib/stripe/plans";
import type { User } from "@prisma/client";

const QUOTA_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export class QuotaExceededError extends Error {
  constructor() {
    super("Search quota exceeded for current billing period");
    this.name = "QuotaExceededError";
  }
}

/**
 * Resets the monthly counter if the rolling 30-day window has elapsed, then
 * atomically consumes one search from quota. Throws QuotaExceededError if
 * none remain. Returns the plan's per-search ad processing limit.
 */
export async function consumeSearchQuota(userId: string): Promise<{ maxAdsToProcess: number }> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const plan = getPlan(user.plan);

    let { searchesUsedThisMonth, quotaResetAt } = user;
    if (Date.now() >= quotaResetAt.getTime()) {
      searchesUsedThisMonth = 0;
      quotaResetAt = new Date(Date.now() + QUOTA_PERIOD_MS);
    }

    if (searchesUsedThisMonth >= plan.searchQuota) {
      throw new QuotaExceededError();
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        searchesUsedThisMonth: searchesUsedThisMonth + 1,
        quotaResetAt,
        searchQuota: plan.searchQuota,
      },
    });

    return { maxAdsToProcess: plan.maxAdsPerSearch };
  });
}

export function quotaStatus(user: User) {
  const plan = getPlan(user.plan);
  const resetPending = Date.now() >= user.quotaResetAt.getTime();
  return {
    plan: plan.id,
    used: resetPending ? 0 : user.searchesUsedThisMonth,
    quota: plan.searchQuota,
    maxAdsPerSearch: plan.maxAdsPerSearch,
    resetsAt: resetPending ? new Date(Date.now() + QUOTA_PERIOD_MS) : user.quotaResetAt,
  };
}
