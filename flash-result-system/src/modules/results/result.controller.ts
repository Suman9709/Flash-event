import type { NextFunction, Request, Response } from "express";
import { findResultByStudentId } from "./result.service.js";

export async function getMyResult(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required",
      });
      return;
    }

    const result = await findResultByStudentId(request.user.studentId);

    if (!result) {
      response.status(404).json({
        success: false,
        message: "Result not found",
      });
      return;
    }

    response.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
}
