import { createClient } from "redis";
import { env } from "./env.js";
import { logError } from "../observability/logger.js";

export const redis = createClient({
  url: env.redisUrl,
});

redis.on("error", (error) => {
  logError("redis_client_error", error);
});

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function closeRedis(): Promise<void> {
  if (redis.isOpen) {
    await redis.quit();
  }
}

export async function checkRedisConnection(): Promise<void> {
  if (!redis.isOpen) {
    throw new Error("Redis client is not connected");
  }

  const reply = await redis.ping();

  if (reply !== "PONG") {
    throw new Error("Redis health check did not return PONG");
  }
}

