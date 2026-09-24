import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { createAccessToken } from "../../config/jwt.js";
import { authenticateStudent } from "./auth.service.js";
import { validateLoginBody } from "./auth.validation.js";

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
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      maxAge: env.jwtExpiresInSeconds * 1000,
      path: "/api/v1",
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
  response.clearCookie("student_access_token", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/api/v1",
  });
  response.status(204).send();
}
