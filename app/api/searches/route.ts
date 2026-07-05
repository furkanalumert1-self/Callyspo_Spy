import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/getOrCreateUser";
import { consumeSearchQuota, QuotaExceededError } from "@/lib/billing/quota";
import { enqueueSearch } from "@/lib/queue/queue";

const createSearchSchema = z.object({
  keyword: z.string().trim().min(2).max(200),
  country: z.string().trim().length(2).optional().default("US"),
  activeStatus: z.enum(["active", "inactive", "all"]).optional().default("all"),
});

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  let maxAdsToProcess: number;
  try {
    ({ maxAdsToProcess } = await consumeSearchQuota(user.id));
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    throw err;
  }

  const search = await prisma.search.create({
    data: {
      userId: user.id,
      keyword: parsed.data.keyword,
      country: parsed.data.country,
      activeStatus: parsed.data.activeStatus,
      maxAdsToProcess,
    },
  });

  try {
    await enqueueSearch(search.id);
  } catch (err) {
    console.error(`Failed to enqueue search ${search.id}`, err);
    await prisma.search.update({
      where: { id: search.id },
      data: {
        status: "failed",
        errorMessage: "Arama kuyruğa eklenemedi. Lütfen REDIS_URL yapılandırmasını kontrol edin.",
        completedAt: new Date(),
      },
    });
    return NextResponse.json(
      { error: "Arama kuyruğa eklenemedi (Redis bağlantısı kurulamadı). Lütfen daha sonra tekrar deneyin." },
      { status: 502 }
    );
  }

  return NextResponse.json({ search }, { status: 201 });
}

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searches = await prisma.search.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { results: true } } },
  });

  return NextResponse.json({ searches });
}
