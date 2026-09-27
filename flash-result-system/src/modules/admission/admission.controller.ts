import type { NextFunction, Request, Response } from "express";
import {
  getAdmissionRequestStatus,
  requestAdmission,
} from "./admission.service.js";

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

    const statusCode = admission.status === "waiting" ? 202 : 201;

    response.status(statusCode).json({
      success: true,
      ...admission,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdmissionStatus(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requestId = Array.isArray(request.params.requestId)
      ? request.params.requestId[0]
      : request.params.requestId;
    const admission = requestId ? await getAdmissionRequestStatus(requestId) : null;

    if (!admission) {
      response.status(404).json({
        success: false,
        message: "Admission request not found or expired",
      });
      return;
    }

    response.status(200).json({
      success: true,
      ...admission,
    });
  } catch (error) {
    next(error);
  }
}
