import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { createAccessToken } from "../../config/jwt.js";
import { authenticateStudent } from "./auth.service.js";
import { validateLoginBody } from "./auth.validation.js";

const studentAccessCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  path: "/api/v1",
};

export async function login(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = validateLoginBody(request.body);

    if (!validation.success) {
      response.status(400).json({
        success: false,
        message: validation.message,
      });
      return;
    }

    const student = await authenticateStudent(validation.data.rollNumber, validation.data.dob);

    if (!student) {
      response.status(401).json({
        success: false,
        message: "Invalid roll number or date of birth",
      });
      return;
    }

    const accessToken = await createAccessToken({
      studentId: student.id,
      rollNumber: student.rollNumber,
    });

    response.cookie("student_access_token", accessToken, {
      ...studentAccessCookieOptions,
      maxAge: env.jwtExpiresInSeconds * 1000,
    });

    response.status(200).json({
      success: true,
      expiresIn: env.jwtExpiresInSeconds,
      student: {
        rollNumber: student.rollNumber,
        name: student.name,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function logout(_request: Request, response: Response): void {
  // Remove the current cookie and a possible older cookie created at the root path.
  response.clearCookie("student_access_token", studentAccessCookieOptions);
  response.clearCookie("student_access_token", {
    ...studentAccessCookieOptions,
    path: "/",
  });
  response.status(204).send();
}
