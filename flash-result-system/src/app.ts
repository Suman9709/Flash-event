import express, { type NextFunction, type Request, type Response } from "express";
import { checkDatabaseConnection } from "./db/pool.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { resultRouter } from "./modules/results/result.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", async (_request, response) => {
    try {
      const database = await checkDatabaseConnection();

      response.status(200).json({
        status: "ok",
        api: "healthy",
        database: {
          status: "connected",
          name: database,
        },
      });
    } catch (error) {
      console.error("Database health check failed", error);
      response.status(503).json({
        status: "error",
        api: "healthy",
        database: {
          status: "disconnected",
        },
      });
    }
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/results", resultRouter);

  app.use((_request, response) => {
    response.status(404).json({
      success: false,
      message: "Route not found",
    });
  });

  app.use(
    (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
      console.error("Unhandled application error", error);
      response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    },
  );

  return app;
}
