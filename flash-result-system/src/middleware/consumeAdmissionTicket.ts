import type { NextFunction, Request, Response } from "express";
import { consumeAdmissionTicket as consumeTicket } from "../modules/admission/admission.cache.js";

export async function consumeAdmissionTicket(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const ticket = request.header("X-Admission-Ticket");

  if (!ticket) {
    response.status(401).json({
      success: false,
      message: "A valid admission ticket is required",
    });
    return;
  }

  try {
    const isValid = await consumeTicket(ticket);

    if (!isValid) {
      response.status(401).json({
        success: false,
        message: "Admission ticket is invalid or expired",
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
