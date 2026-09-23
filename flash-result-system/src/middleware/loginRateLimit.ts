import type { NextFunction, Request, Response } from "express";

type Attempt = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Attempt>();
const windowMs = 15 * 60 * 1000;
const maxAttempts = 5;

export function loginRateLimit(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const clientIp = request.ip ?? request.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const previousAttempt = attempts.get(clientIp);

  if (!previousAttempt || now >= previousAttempt.resetAt) {
    attempts.set(clientIp, {
      count: 1,
      resetAt: now + windowMs,
    });
    next();
    return;
  }

  if (previousAttempt.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((previousAttempt.resetAt - now) / 1000);

    response.setHeader("Retry-After", String(retryAfterSeconds));
    response.status(429).json({
      success: false,
      message: `Too many login attempts. Try again in ${retryAfterSeconds} seconds.`,
    });
    return;
  }

  previousAttempt.count += 1;
  next();
}
