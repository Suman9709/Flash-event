import { env } from "../config/env.js";
import { closeRedis, connectRedis } from "../config/redis.js";
import { promoteNextQueuedRequest } from "../modules/admission/admission.cache.js";

let isDraining = false;

async function drainAdmissionQueue(): Promise<void> {
  if (isDraining) {
    return;
  }

  isDraining = true;

  try {
    let admittedCount = 0;

    while (await promoteNextQueuedRequest()) {
      admittedCount += 1;
    }

    if (admittedCount > 0) {
      console.log(`Admitted ${admittedCount} waiting request(s).`);
    }
  } catch (error) {
    console.error("Admission queue drain failed", error);
  } finally {
    isDraining = false;
  }
}

async function startAdmissionQueueWorker(): Promise<void> {
  await connectRedis();
  await drainAdmissionQueue();

  const interval = setInterval(() => {
    void drainAdmissionQueue();
  }, env.admissionQueueDrainIntervalMs);

  async function shutdown(signal: string): Promise<void> {
    console.log(`${signal} received; stopping admission queue worker`);
    clearInterval(interval);
    await closeRedis();
    process.exit(0);
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

void startAdmissionQueueWorker().catch(async (error: unknown) => {
  console.error("Admission queue worker failed to start", error);
  await closeRedis();
  process.exit(1);
});
