import type { AuthenticatedStudent } from "./auth.types.js";
import { authenticateCachedStudent } from "./auth.cache.js";

export async function authenticateStudent(
  rollNumber: string,
  dob: string,
): Promise<AuthenticatedStudent | null> {
  return authenticateCachedStudent(rollNumber, dob);
}
