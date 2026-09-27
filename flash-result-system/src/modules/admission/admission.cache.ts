import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";
import type { TokenBucketDecision } from "./admission.types.js";

const admissionBucketKey = "admission:bucket";

function getAdmissionTicketKey(ticket: string): string {
  return `admission:ticket:${ticket}`;
}

const consumeAdmissionCapacityScript = `
  local stored = redis.call("HMGET", KEYS[1], "tokens", "updatedAtMs")
  local tokens = stored[1] and tonumber(stored[1]) or nil
  local updatedAtMs = stored[2] and tonumber(stored[2]) or nil

  local nowMs = tonumber(ARGV[1])
  local capacity = tonumber(ARGV[2])
  local refillPerSecond = tonumber(ARGV[3])

  if tokens == nil or updatedAtMs == nil then
    tokens = capacity
    updatedAtMs = nowMs
  end

  local elapsedSeconds = math.max(0, (nowMs - updatedAtMs) / 1000)
  tokens = math.min(capacity, tokens + (elapsedSeconds * refillPerSecond))

  local ttlMs = math.ceil((capacity / refillPerSecond) * 2000)

  if tokens < 1 then
    redis.call("HSET", KEYS[1], "tokens", tokens, "updatedAtMs", nowMs)
    redis.call("PEXPIRE", KEYS[1], ttlMs)

    local retryAfterMs = math.ceil(((1 - tokens) / refillPerSecond) * 1000)
    return { 0, math.max(1, retryAfterMs) }
  end

  tokens = tokens - 1

  redis.call("HSET", KEYS[1], "tokens", tokens, "updatedAtMs", nowMs)
  redis.call("PEXPIRE", KEYS[1], ttlMs)

  return { 1, math.floor(tokens) }
`;

export async function tryConsumeAdmissionCapacity(): Promise<TokenBucketDecision> {
  const reply = (await redis.eval(consumeAdmissionCapacityScript, {
    keys: [admissionBucketKey],
    arguments: [
      String(Date.now()),
      String(env.admissionCapacity),
      String(env.admissionRefillPerSecond),
    ],
  })) as unknown[];

  const admitted = Number(reply[0]) === 1;
  const value = Number(reply[1]);

  if (admitted) {
    return {
      admitted: true,
      remainingTokens: value,
    };
  }

  return {
    admitted: false,
    retryAfterSeconds: Math.max(1, Math.ceil(value / 1000)),
  };
}

export async function createAdmissionTicket(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ticket = randomBytes(32).toString("base64url");
    const result = await redis.set(getAdmissionTicketKey(ticket), "valid", {
      EX: env.admissionTicketTtlSeconds,
      NX: true,
    });

    if (result === "OK") {
      return ticket;
    }
  }

  throw new Error("Could not create an admission ticket");
}

export async function consumeAdmissionTicket(ticket: string): Promise<boolean> {
  const value = await redis.getDel(getAdmissionTicketKey(ticket));

  return value === "valid";
}
