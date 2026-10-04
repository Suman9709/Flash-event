import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logInfo } from "../observability/logger.js";

function durationInMilliseconds(startedAt: bigint): number {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
}

function isHealthCheck(path: string): boolean {
  return path === "/health" || path === "/health/live" || path === "/health/ready";
}

export function requestContext(request: Request, response: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();

  response.locals.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);

  response.on("finish", () => {
    if (isHealthCheck(request.path) && response.statusCode < 400) {
      return;
    }

    logInfo("http_request_completed", {
      requestId,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Number(durationInMilliseconds(startedAt).toFixed(2)),
      clientIp: request.ip,
    });
  });

  next();
}
