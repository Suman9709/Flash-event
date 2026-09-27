import type { NextFunction, Request, Response } from "express";
import { consumeLoginAttempt } from "../modules/auth/auth.rateLimit.js";

function getRollNumber(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const rollNumber = (body as Record<string, unknown>).rollNumber;

  if (typeof rollNumber !== "string") {
    return null;
  }

  const normalizedRollNumber = rollNumber.trim();

  return normalizedRollNumber || null;
}

export async function loginRateLimit(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const clientIp = request.ip ?? request.socket.remoteAddress ?? "unknown";

  try {
    const decision = await consumeLoginAttempt(clientIp, getRollNumber(request.body));

    if (!decision.allowed) {
      response.setHeader("Retry-After", String(decision.retryAfterSeconds));
      response.status(429).json({
        success: false,
        message: `Too many login attempts. Try again in ${decision.retryAfterSeconds} seconds.`,
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
