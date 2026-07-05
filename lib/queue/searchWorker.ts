import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/db/prisma";
import { redisConnection } from "./connection";
import { SEARCH_QUEUE_NAME, type SearchJobData } from "./queue";
import { runFacebookAdsLibraryScraper, type FacebookAdItem } from "@/lib/apify/facebookAdsLibrary";
import { runAmazonSearchScraper, parseAmazonRating } from "@/lib/apify/amazonSearch";
import { fetchWebsite } from "@/lib/scraping/fetchWebsite";
import { htmlToPlainText } from "@/lib/scraping/htmlToPlainText";
import { findProductName, NO_PRODUCT_FOUND } from "@/lib/ai/productNameFinder";
import { notifySearchCompleted } from "@/lib/notifications/notifyUser";

const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 2);

export async function processSearch(searchId: string): Promise<void> {
  const search = await prisma.search.findUniqueOrThrow({
    where: { id: searchId },
    include: { user: true },
  });

  await prisma.search.update({
    where: { id: searchId },
    data: { status: "running" },
  });

  try {
    // Apify runs may return far more ads than the plan is allowed to process,
    // so we ask for a bit of headroom and then cap processing client-side.
    const requestCount = Math.max(search.maxAdsToProcess * 3, 20);
    const { runId, ads } = await runFacebookAdsLibraryScraper(
      search.keyword,
      search.country,
      search.activeStatus,
      requestCount
    );

    const adsToProcess = ads.slice(0, search.maxAdsToProcess);

    await prisma.search.update({
      where: { id: searchId },
      data: { fbRunId: runId, adsFound: ads.length },
    });

    let processed = 0;
    for (const ad of adsToProcess) {
      try {
        await processAd(searchId, ad);
      } catch (err) {
        console.error(`Ad processing failed for ${ad.snapshot?.page_name}`, err);
      } finally {
        processed += 1;
        await prisma.search.update({
          where: { id: searchId },
          data: { adsProcessed: processed },
        });
      }
    }

    const matchCount = await prisma.productMatch.count({ where: { searchId } });

    await prisma.search.update({
      where: { id: searchId },
      data: { status: "completed", completedAt: new Date() },
    });

    await notifySearchCompleted(search.user.email, searchId, search.keyword, matchCount);
  } catch (err) {
    console.error(`Search ${searchId} failed`, err);
    await prisma.search.update({
      where: { id: searchId },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}

async function processAd(searchId: string, ad: FacebookAdItem): Promise<void> {
  const snapshot = ad.snapshot;
  const linkUrl = snapshot?.cards?.[0]?.link_url;

  const siteHtml = await fetchWebsite(linkUrl);
  const plainText = htmlToPlainText(siteHtml);

  const productName = await findProductName({
    plainText,
    pageName: snapshot?.page_name,
    caption: snapshot?.caption,
    bodyText: snapshot?.body?.text,
  });

  if (productName === NO_PRODUCT_FOUND) return;

  const amazonResults = await runAmazonSearchScraper(productName);
  const bestMatch = amazonResults[0];
  if (!bestMatch) return;

  await prisma.productMatch.create({
    data: {
      searchId,
      fbPageName: snapshot?.page_name,
      fbPageProfileUri: snapshot?.page_profile_uri,
      fbAdLinkUrl: linkUrl,
      fbAdBodyText: snapshot?.body?.text,
      detectedProductName: productName,
      amazonUrl: bestMatch.dpUrl ? `https://www.amazon.com${bestMatch.dpUrl}` : undefined,
      amazonTitle: bestMatch.productDescription,
      amazonPrice: bestMatch.price,
      amazonRating: parseAmazonRating(bestMatch.productRating) ?? undefined,
    },
  });
}

export function createSearchWorker(): Worker<SearchJobData> {
  return new Worker<SearchJobData>(
    SEARCH_QUEUE_NAME,
    async (job: Job<SearchJobData>) => {
      await processSearch(job.data.searchId);
    },
    {
      connection: redisConnection,
      concurrency: WORKER_CONCURRENCY,
    }
  );
}
