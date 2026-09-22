import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closePool } from "./db/pool.js";

const app = createApp();
const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);

  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
