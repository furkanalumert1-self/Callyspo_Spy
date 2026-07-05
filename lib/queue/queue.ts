import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const SEARCH_QUEUE_NAME = "search-processing";

export interface SearchJobData {
  searchId: string;
}

const globalForQueue = globalThis as unknown as { searchQueue: Queue<SearchJobData> | undefined };

/**
 * Lazily instantiated: constructing a BullMQ Queue opens a Redis connection
 * immediately, which would crash `next build`'s page-data collection (no
 * runtime env vars present at build time). Real requests always have
 * REDIS_URL set by the time this is called.
 */
function getSearchQueue(): Queue<SearchJobData> {
  if (!globalForQueue.searchQueue) {
    globalForQueue.searchQueue = new Queue<SearchJobData>(SEARCH_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }
  return globalForQueue.searchQueue;
}

export async function enqueueSearch(searchId: string) {
  return getSearchQueue().add("process-search", { searchId }, { jobId: searchId });
}
