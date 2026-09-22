import { SignJWT, jwtVerify } from "jose";
import { env } from "./env.js";

export type AuthenticatedUser = {
  studentId: number;
  rollNumber: string;
};

const secret = new TextEncoder().encode(env.jwtSecret);

export async function createAccessToken(user: AuthenticatedUser): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + env.jwtExpiresInSeconds;

  return new SignJWT({ rollNumber: user.rollNumber })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(user.studentId))
    .setIssuer(env.jwtIssuer)
    .setAudience(env.jwtAudience)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AuthenticatedUser> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
  });

  const studentId = Number(payload.sub);
  const rollNumber = payload.rollNumber;

  if (!Number.isSafeInteger(studentId) || studentId <= 0 || typeof rollNumber !== "string") {
    throw new Error("Access token has an invalid payload");
  }

  return { studentId, rollNumber };
}
