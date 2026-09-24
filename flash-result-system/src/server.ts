import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeRedis, connectRedis } from "./config/redis.js";
import { closePool } from "./db/pool.js";

async function startServer(): Promise<void> {
  await connectRedis();

  const app = createApp();
  const server = app.listen(env.port, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });

  async function shutdown(signal: string): Promise<void> {
    console.log(`${signal} received; shutting down`);

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
  console.error("Server startup failed", error);
  await closeRedis();
  await closePool();
  process.exit(1);
});
