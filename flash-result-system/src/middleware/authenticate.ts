import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../config/jwt.js";

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({
      success: false,
      message: "A Bearer access token is required",
    });
    return;
  }

  try {
    request.user = await verifyAccessToken(authorization.slice("Bearer ".length));
    next();
  } catch {
    response.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}
