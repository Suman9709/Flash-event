import { randomBytes, randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";
import type {
  AdmissionRequestStatus,
  AdmissionResponse,
} from "./admission.types.js";

const admissionBucketKey = "admission:bucket";
const admissionQueueKey = "admission:queue";
const admissionRequestKeyPrefix = "admission:request:";
const admissionTicketKeyPrefix = "admission:ticket:";
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ticketPattern = /^[A-Za-z0-9_-]{43}$/;

function getAdmissionRequestKey(requestId: string): string {
  return `${admissionRequestKeyPrefix}${requestId}`;
}

function getAdmissionTicketKey(ticket: string): string {
  return `${admissionTicketKeyPrefix}${ticket}`;
}

function isAdmissionRequestStatus(value: unknown): value is AdmissionRequestStatus {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const status = value as Record<string, unknown>;

  if (status.status === "waiting") {
    return true;
  }

  return (
    status.status === "admitted" &&
    typeof status.ticket === "string" &&
    typeof status.expiresInSeconds === "number"
  );
}

const admitOrQueueScript = `
  local stored = redis.call("HMGET", KEYS[1], "tokens", "updatedAtMs")
  local tokens = stored[1] and tonumber(stored[1]) or nil
  local updatedAtMs = stored[2] and tonumber(stored[2]) or nil

  local nowMs = tonumber(ARGV[1])
  local capacity = tonumber(ARGV[2])
  local refillPerSecond = tonumber(ARGV[3])
  local queueMaxSize = tonumber(ARGV[4])
  local requestId = ARGV[5]
  local requestKey = ARGV[6]
  local ticketKey = ARGV[7]
  local ticketTtlSeconds = tonumber(ARGV[9])
  local requestTtlSeconds = tonumber(ARGV[10])
  local requestKeyPrefix = ARGV[11]

  while redis.call("LLEN", KEYS[2]) > 0 do
    local oldestRequestId = redis.call("LINDEX", KEYS[2], -1)
    if redis.call("EXISTS", requestKeyPrefix .. oldestRequestId) == 1 then
      break
    end
    redis.call("RPOP", KEYS[2])
  end

  if tokens == nil or updatedAtMs == nil then
    tokens = capacity
    updatedAtMs = nowMs
  end

  local elapsedSeconds = math.max(0, (nowMs - updatedAtMs) / 1000)
  tokens = math.min(capacity, tokens + (elapsedSeconds * refillPerSecond))
  local bucketTtlMs = math.ceil((capacity / refillPerSecond) * 2000)
  local queueLength = redis.call("LLEN", KEYS[2])

  if queueLength == 0 and tokens >= 1 then
    tokens = tokens - 1
    redis.call("HSET", KEYS[1], "tokens", tokens, "updatedAtMs", nowMs)
    redis.call("PEXPIRE", KEYS[1], bucketTtlMs)
    redis.call("SET", ticketKey, "valid", "EX", ticketTtlSeconds)
    return { 1, math.floor(tokens) }
  end

  redis.call("HSET", KEYS[1], "tokens", tokens, "updatedAtMs", nowMs)
  redis.call("PEXPIRE", KEYS[1], bucketTtlMs)

  if queueLength >= queueMaxSize then
    return { 0, 5 }
  end

  redis.call("SET", requestKey, '{"status":"waiting"}', "EX", requestTtlSeconds)
  redis.call("LPUSH", KEYS[2], requestId)
  return { 2, queueLength + 1 }
`;

const promoteQueuedRequestScript = `
  local stored = redis.call("HMGET", KEYS[1], "tokens", "updatedAtMs")
  local tokens = stored[1] and tonumber(stored[1]) or nil
  local updatedAtMs = stored[2] and tonumber(stored[2]) or nil

  local nowMs = tonumber(ARGV[1])
  local capacity = tonumber(ARGV[2])
  local refillPerSecond = tonumber(ARGV[3])
  local requestKeyPrefix = ARGV[4]
  local ticketKey = ARGV[5]
  local ticket = ARGV[6]
  local ticketTtlSeconds = tonumber(ARGV[7])

  while redis.call("LLEN", KEYS[2]) > 0 do
    local oldestRequestId = redis.call("LINDEX", KEYS[2], -1)
    if redis.call("EXISTS", requestKeyPrefix .. oldestRequestId) == 1 then
      break
    end
    redis.call("RPOP", KEYS[2])
  end

  if redis.call("LLEN", KEYS[2]) == 0 then
    return { 0 }
  end

  if tokens == nil or updatedAtMs == nil then
    tokens = capacity
    updatedAtMs = nowMs
  end

  local elapsedSeconds = math.max(0, (nowMs - updatedAtMs) / 1000)
  tokens = math.min(capacity, tokens + (elapsedSeconds * refillPerSecond))
  local bucketTtlMs = math.ceil((capacity / refillPerSecond) * 2000)

  if tokens < 1 then
    redis.call("HSET", KEYS[1], "tokens", tokens, "updatedAtMs", nowMs)
    redis.call("PEXPIRE", KEYS[1], bucketTtlMs)
    return { 0 }
  end

  local requestId = redis.call("RPOP", KEYS[2])
  local requestKey = requestKeyPrefix .. requestId

  tokens = tokens - 1
  redis.call("HSET", KEYS[1], "tokens", tokens, "updatedAtMs", nowMs)
  redis.call("PEXPIRE", KEYS[1], bucketTtlMs)
  redis.call("SET", ticketKey, "valid", "EX", ticketTtlSeconds)
  redis.call(
    "SET",
    requestKey,
    '{"status":"admitted","ticket":"' .. ticket .. '","expiresInSeconds":' .. ticketTtlSeconds .. '}',
    "EX",
    ticketTtlSeconds
  )

  return { 1, requestId }
`;

export async function admitOrQueue(): Promise<AdmissionResponse> {
  const requestId = randomUUID();
  const ticket = randomBytes(32).toString("base64url");
  const reply = (await redis.eval(admitOrQueueScript, {
    keys: [admissionBucketKey, admissionQueueKey],
    arguments: [
      String(Date.now()),
      String(env.admissionCapacity),
      String(env.admissionRefillPerSecond),
      String(env.admissionQueueMaxSize),
      requestId,
      getAdmissionRequestKey(requestId),
      getAdmissionTicketKey(ticket),
      ticket,
      String(env.admissionTicketTtlSeconds),
      String(env.admissionRequestTtlSeconds),
      admissionRequestKeyPrefix,
    ],
  })) as unknown[];

  const outcome = Number(reply[0]);
  const value = Number(reply[1]);

  if (outcome === 1) {
    return {
      status: "admitted",
      ticket,
      expiresInSeconds: env.admissionTicketTtlSeconds,
      remainingTokens: value,
    };
  }

  if (outcome === 2) {
    return {
      status: "waiting",
      requestId,
      expiresInSeconds: env.admissionRequestTtlSeconds,
      queuePosition: value,
    };
  }

  return {
    status: "rejected",
    retryAfterSeconds: Math.max(1, value),
  };
}

export async function promoteNextQueuedRequest(): Promise<boolean> {
  const ticket = randomBytes(32).toString("base64url");
  const reply = (await redis.eval(promoteQueuedRequestScript, {
    keys: [admissionBucketKey, admissionQueueKey],
    arguments: [
      String(Date.now()),
      String(env.admissionCapacity),
      String(env.admissionRefillPerSecond),
      admissionRequestKeyPrefix,
      getAdmissionTicketKey(ticket),
      ticket,
      String(env.admissionTicketTtlSeconds),
    ],
  })) as unknown[];

  return Number(reply[0]) === 1;
}

export async function findAdmissionRequestStatus(
  requestId: string,
): Promise<AdmissionRequestStatus | null> {
  if (!requestIdPattern.test(requestId)) {
    return null;
  }

  const cachedValue = await redis.get(getAdmissionRequestKey(requestId));

  if (!cachedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(cachedValue);

    return isAdmissionRequestStatus(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export async function consumeAdmissionTicket(ticket: string): Promise<boolean> {
  if (!ticketPattern.test(ticket)) {
    return false;
  }

  const value = await redis.getDel(getAdmissionTicketKey(ticket));

  return value === "valid";
}
