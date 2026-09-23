import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../config/jwt.js";

const accessTokenCookieName = "student_access_token";

function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");

    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return undefined;
}

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const accessToken = getCookie(request, accessTokenCookieName);

  if (!accessToken) {
    response.status(401).json({
      success: false,
      message: "Authentication is required",
    });
    return;
  }

  try {
    request.user = await verifyAccessToken(accessToken);
    next();
  } catch {
    response.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}
