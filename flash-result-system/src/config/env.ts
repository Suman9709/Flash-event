import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be defined in .env`);
  }

  return value;
}

function positiveInteger(name: string, defaultValue: number): number {
  const value = process.env[name] ?? String(defaultValue);
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

const jwtSecret = required("JWT_SECRET");
const authCacheSecret = required("AUTH_CACHE_SECRET");

if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters");
}

if (authCacheSecret.length < 32) {
  throw new Error("AUTH_CACHE_SECRET must contain at least 32 characters");
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  port: positiveInteger("PORT", 3000),
  jwtSecret,
  jwtIssuer: required("JWT_ISSUER"),
  jwtAudience: required("JWT_AUDIENCE"),
  jwtExpiresInSeconds: positiveInteger("JWT_EXPIRES_IN_SECONDS", 900),
  redisUrl: required("REDIS_URL"),
  authCacheSecret,
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production",
};
