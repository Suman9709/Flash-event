import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function allowFrontendOrigin(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (request.headers.origin === env.frontendOrigin) {
    response.setHeader("Access-Control-Allow-Origin", env.frontendOrigin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Vary", "Origin");
  }

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
}
