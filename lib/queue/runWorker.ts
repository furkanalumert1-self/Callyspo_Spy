import "dotenv/config";
import { createSearchWorker } from "./searchWorker";

const worker = createSearchWorker();

worker.on("completed", (job) => {
  console.log(`[worker] search ${job.data.searchId} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] search ${job?.data.searchId} failed:`, err);
});

console.log("[worker] AdSpy search worker started, waiting for jobs...");

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
