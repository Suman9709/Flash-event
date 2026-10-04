import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeRedis, connectRedis } from "./config/redis.js";
import { closePool } from "./db/pool.js";
import { logError, logInfo } from "./observability/logger.js";

async function startServer(): Promise<void> {
  await connectRedis();

  const app = createApp();
  const server = app.listen(env.port, "0.0.0.0", () => {
    logInfo("api_listening", {
      port: env.port,
    });
  });

  async function shutdown(signal: string): Promise<void> {
    logInfo("api_shutdown_started", { signal });

    server.close(async () => {
      await closeRedis();
      await closePool();
      process.exit(0);
    });
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

void startServer().catch(async (error: unknown) => {
  logError("api_startup_failed", error);
  await closeRedis();
  await closePool();
  process.exit(1);
});
