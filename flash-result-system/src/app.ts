import express, { type NextFunction, type Request, type Response } from "express";
import { env } from "./config/env.js";
import { checkRedisConnection } from "./config/redis.js";
import { checkDatabaseConnection } from "./db/pool.js";
import { allowFrontendOrigin } from "./middleware/cors.js";
import { requestContext } from "./middleware/requestContext.js";
import { admissionRouter } from "./modules/admission/admission.route.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { resultRouter } from "./modules/results/result.routes.js";
import { logError } from "./observability/logger.js";

async function readinessCheck(_request: Request, response: Response): Promise<void> {
  const [database, redis] = await Promise.allSettled([
    checkDatabaseConnection(),
    checkRedisConnection(),
  ]);
  const ready = database.status === "fulfilled" && redis.status === "fulfilled";

  if (!ready) {
    if (database.status === "rejected") {
      logError("database_readiness_check_failed", database.reason, {
        requestId: response.locals.requestId,
      });
    }

    if (redis.status === "rejected") {
      logError("redis_readiness_check_failed", redis.reason, {
        requestId: response.locals.requestId,
      });
    }
  }

  response.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "error",
    api: "ready",
    instanceId: env.appInstanceId,
    database:
      database.status === "fulfilled"
        ? { status: "connected", name: database.value }
        : { status: "disconnected" },
    redis: redis.status === "fulfilled" ? { status: "connected" } : { status: "disconnected" },
  });
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  // Nginx is the only direct peer for API containers in Docker. Trust exactly
  // that one proxy hop so request.ip remains the real client IP for rate limits.
  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(requestContext);
  app.use(allowFrontendOrigin);
  app.use(express.json({ limit: "10kb" }));

  app.get("/health/live", (_request, response) => {
    response.status(200).json({
      status: "ok",
      api: "live",
      instanceId: env.appInstanceId,
    });
  });
  app.get("/health/ready", readinessCheck);
  app.get("/health", readinessCheck);

  app.use("/api/v1/admission", admissionRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/results", resultRouter);

  app.use((_request, response) => {
    response.status(404).json({
      success: false,
      message: "Route not found",
      requestId: response.locals.requestId,
    });
  });

  app.use(
    (error: unknown, request: Request, response: Response, _next: NextFunction) => {
      logError("http_request_failed", error, {
        requestId: response.locals.requestId,
        method: request.method,
        path: request.path,
      });
      response.status(500).json({
        success: false,
        message: "Internal server error",
        requestId: response.locals.requestId,
      });
    },
  );

  return app;
}
