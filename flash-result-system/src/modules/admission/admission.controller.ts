import type { NextFunction, Request, Response } from "express";
import { requestAdmission } from "./admission.service.js";

export async function enterAdmission(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admission = await requestAdmission();

    if (admission.status === "rejected") {
      response.setHeader("Retry-After", String(admission.retryAfterSeconds));
      response.status(429).json({
        success: false,
        message: "The result portal is busy. Please try again shortly.",
        retryAfterSeconds: admission.retryAfterSeconds,
      });
      return;
    }

    response.status(201).json({
      success: true,
      ...admission,
    });
  } catch (error) {
    next(error);
  }
}
