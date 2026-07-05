import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as { redisConnection: IORedis | undefined };

function createConnection(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set");
  return new IORedis(url, { maxRetriesPerRequest: null });
}

/**
 * Lazily instantiated so `next build` (which loads route modules without
 * runtime env vars present) doesn't crash trying to open a Redis connection.
 * Real requests always run with REDIS_URL set.
 */
function getRedisConnection(): IORedis {
  if (!globalForRedis.redisConnection) {
    globalForRedis.redisConnection = createConnection();
  }
  return globalForRedis.redisConnection;
}

export const redisConnection = new Proxy({} as IORedis, {
  get(_target, prop, receiver) {
    return Reflect.get(getRedisConnection(), prop, receiver);
  },
});
