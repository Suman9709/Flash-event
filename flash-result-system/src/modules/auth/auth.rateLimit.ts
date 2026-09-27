import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";

export type LoginRateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

function getIpRateLimitKey(clientIp: string): string {
  return `rate-limit:login:ip:${encodeURIComponent(clientIp)}`;
}

function getRollNumberRateLimitKey(rollNumber: string): string {
  return `rate-limit:login:roll:${encodeURIComponent(rollNumber)}`;
}

const consumeLoginAttemptScript = `
  local windowSeconds = tonumber(ARGV[1])
  local ipLimit = tonumber(ARGV[2])
  local rollNumberLimit = tonumber(ARGV[3])

  local ipCount = redis.call("INCR", KEYS[1])
  if ipCount == 1 then
    redis.call("EXPIRE", KEYS[1], windowSeconds)
  end

  local retryAfterSeconds = redis.call("TTL", KEYS[1])
  local allowed = ipCount <= ipLimit

  if #KEYS == 2 then
    local rollNumberCount = redis.call("INCR", KEYS[2])
    if rollNumberCount == 1 then
      redis.call("EXPIRE", KEYS[2], windowSeconds)
    end

    local rollNumberRetryAfterSeconds = redis.call("TTL", KEYS[2])
    allowed = allowed and rollNumberCount <= rollNumberLimit
    retryAfterSeconds = math.max(retryAfterSeconds, rollNumberRetryAfterSeconds)
  end

  return { allowed and 1 or 0, math.max(1, retryAfterSeconds) }
`;

export async function consumeLoginAttempt(
  clientIp: string,
  rollNumber: string | null,
): Promise<LoginRateLimitDecision> {
  const keys = [getIpRateLimitKey(clientIp)];

  if (rollNumber) {
    keys.push(getRollNumberRateLimitKey(rollNumber));
  }

  const reply = (await redis.eval(consumeLoginAttemptScript, {
    keys,
    arguments: [
      String(env.loginRateLimitWindowSeconds),
      String(env.loginRateLimitMaxAttemptsPerIp),
      String(env.loginRateLimitMaxAttemptsPerRollNumber),
    ],
  })) as unknown[];

  if (Number(reply[0]) === 1) {
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Number(reply[1])),
  };
}
