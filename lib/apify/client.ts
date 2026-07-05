const APIFY_API_BASE = "https://api.apify.com/v2";

type ApifyRunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMED-OUT"
  | "ABORTED";

interface ApifyRun {
  id: string;
  status: ApifyRunStatus;
  defaultDatasetId: string;
}

function getApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not set");
  return token;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getApifyToken()}`,
    "Content-Type": "application/json",
  };
}

export async function startActorRun(
  actorId: string,
  input: Record<string, unknown>
): Promise<ApifyRun> {
  const res = await fetch(`${APIFY_API_BASE}/acts/${actorId}/runs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Apify run start failed (${actorId}): ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.data as ApifyRun;
}

async function getRun(runId: string): Promise<ApifyRun> {
  const res = await fetch(`${APIFY_API_BASE}/actor-runs/${runId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Apify get run failed (${runId}): ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.data as ApifyRun;
}

const TERMINAL_STATUSES: ApifyRunStatus[] = ["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"];

export interface PollOptions {
  /** Max time to wait before giving up, in ms. */
  timeoutMs?: number;
  /** Initial delay between polls, in ms (grows with exponential backoff). */
  initialDelayMs?: number;
  /** Max delay between polls, in ms. */
  maxDelayMs?: number;
}

/**
 * Apify runs are async; n8n modeled this as a Wait+If loop. Here we poll the
 * run status with exponential backoff until it reaches a terminal state.
 */
export async function pollUntilDone(runId: string, options: PollOptions = {}): Promise<ApifyRun> {
  const { timeoutMs = 10 * 60 * 1000, initialDelayMs = 2000, maxDelayMs = 15000 } = options;
  const start = Date.now();
  let delay = initialDelayMs;

  while (true) {
    const run = await getRun(runId);
    if (TERMINAL_STATUSES.includes(run.status)) {
      if (run.status !== "SUCCEEDED") {
        throw new Error(`Apify run ${runId} ended with status ${run.status}`);
      }
      return run;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Apify run ${runId} timed out after ${timeoutMs}ms`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, maxDelayMs);
  }
}

export async function getDatasetItems<T = unknown>(datasetId: string): Promise<T[]> {
  const res = await fetch(`${APIFY_API_BASE}/datasets/${datasetId}/items?clean=true&format=json`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Apify get dataset items failed (${datasetId}): ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T[];
}

export async function runActorAndGetResults<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  pollOptions?: PollOptions
): Promise<{ runId: string; items: T[] }> {
  const run = await startActorRun(actorId, input);
  const finished = await pollUntilDone(run.id, pollOptions);
  const items = await getDatasetItems<T>(finished.defaultDatasetId);
  return { runId: run.id, items };
}
