import { runActorAndGetResults } from "./client";

const ACTOR_ID = "axesso_data~amazon-search-scraper";

export interface AmazonSearchResultItem {
  dpUrl?: string;
  productDescription?: string;
  price?: number;
  productRating?: string;
}

export async function runAmazonSearchScraper(
  keyword: string,
  domainCode: string = "com"
): Promise<AmazonSearchResultItem[]> {
  const { items } = await runActorAndGetResults<AmazonSearchResultItem>(ACTOR_ID, {
    keyword,
    domainCode,
    sortBy: "recent",
    maxPages: 1,
    category: "aps",
  });

  return items;
}

/** "4.5 out of 5 stars" -> 4.5 */
export function parseAmazonRating(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}
