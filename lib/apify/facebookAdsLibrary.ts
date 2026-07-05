import { runActorAndGetResults } from "./client";

const ACTOR_ID = "curious_coder~facebook-ads-library-scraper";

export interface FacebookAdSnapshot {
  page_name?: string;
  page_profile_uri?: string;
  caption?: string;
  cards?: Array<{ link_url?: string }>;
  body?: { text?: string };
}

export interface FacebookAdItem {
  snapshot?: FacebookAdSnapshot;
}

function buildFacebookLibraryUrl(keyword: string, country: string, activeStatus: string): string {
  const params = new URLSearchParams({
    active_status: activeStatus,
    ad_type: "all",
    country,
    q: keyword,
    search_type: "keyword_unordered",
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

export async function runFacebookAdsLibraryScraper(
  keyword: string,
  country: string = "US",
  activeStatus: string = "all",
  count: number = 20
): Promise<{ runId: string; ads: FacebookAdItem[] }> {
  const facebookLibraryUrl = buildFacebookLibraryUrl(keyword, country, activeStatus);

  const { runId, items } = await runActorAndGetResults<FacebookAdItem>(ACTOR_ID, {
    count,
    scrapeAdDetails: true,
    "scrapePageAds.activeStatus": activeStatus,
    urls: [{ url: facebookLibraryUrl, method: "GET" }],
  });

  return { runId, ads: items };
}
