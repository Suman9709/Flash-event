import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";
import type { AuthenticatedStudent } from "./auth.types.js";

export type AuthSnapshotSource = {
  studentId: number;
  rollNumber: string;
  name: string;
  dob: string;
  isActive: boolean;
};

type CachedStudentAuthentication = {
  studentId: number;
  rollNumber: string;
  name: string;
  dobVerifier: string;
  isActive: boolean;
};

const snapshotBatchSize = 500;

function getAuthenticationCacheKey(rollNumber: string): string {
  return `auth:${rollNumber}`;
}

function createDateOfBirthVerifier(dateOfBirth: string): string {
  return createHmac("sha256", env.authCacheSecret)
    .update(dateOfBirth)
    .digest("base64url");
}

function verifiersMatch(storedVerifier: string, submittedVerifier: string): boolean {
  const storedVerifierBuffer = Buffer.from(storedVerifier);
  const submittedVerifierBuffer = Buffer.from(submittedVerifier);

  return (
    storedVerifierBuffer.length === submittedVerifierBuffer.length &&
    timingSafeEqual(storedVerifierBuffer, submittedVerifierBuffer)
  );
}

function isCachedStudentAuthentication(value: unknown): value is CachedStudentAuthentication {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const cachedStudent = value as Record<string, unknown>;

  return (
    typeof cachedStudent.studentId === "number" &&
    typeof cachedStudent.rollNumber === "string" &&
    typeof cachedStudent.name === "string" &&
    typeof cachedStudent.dobVerifier === "string" &&
    typeof cachedStudent.isActive === "boolean"
  );
}

export async function writeAuthSnapshots(students: AuthSnapshotSource[]): Promise<void> {
  for (let batchStartIndex = 0; batchStartIndex < students.length; batchStartIndex += snapshotBatchSize) {
    const studentBatch = students.slice(batchStartIndex, batchStartIndex + snapshotBatchSize);
    const redisPipeline = redis.multi();

    for (const student of studentBatch) {
      const cachedStudent: CachedStudentAuthentication = {
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        name: student.name,
        // Redis stores only a verifier, never the student's raw date of birth.
        dobVerifier: createDateOfBirthVerifier(student.dob),
        isActive: student.isActive,
      };

      redisPipeline.set(
        getAuthenticationCacheKey(student.rollNumber),
        JSON.stringify(cachedStudent),
      );
    }

    // Pipelining keeps a large snapshot rebuild from making one Redis round trip per student.
    await redisPipeline.exec();
  }
}

export async function authenticateCachedStudent(
  rollNumber: string,
  dateOfBirth: string,
): Promise<AuthenticatedStudent | null> {
  const cachedValue = await redis.get(getAuthenticationCacheKey(rollNumber));

  if (!cachedValue) {
    return null;
  }

  let cachedStudentValue: unknown;

  try {
    cachedStudentValue = JSON.parse(cachedValue);
  } catch {
    return null;
  }

  if (!isCachedStudentAuthentication(cachedStudentValue) || !cachedStudentValue.isActive) {
    return null;
  }

  const submittedDateOfBirthVerifier = createDateOfBirthVerifier(dateOfBirth);

  if (!verifiersMatch(cachedStudentValue.dobVerifier, submittedDateOfBirthVerifier)) {
    return null;
  }

  return {
    id: cachedStudentValue.studentId,
    rollNumber: cachedStudentValue.rollNumber,
    name: cachedStudentValue.name,
  };
}
