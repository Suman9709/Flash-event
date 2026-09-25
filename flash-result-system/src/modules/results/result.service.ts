import { findCachedResultByStudentId } from "./result.cache.js";
import type { StudentResult } from "./result.types.js";

export async function findResultByStudentId(
  studentId: number,
): Promise<StudentResult | null> {
  return findCachedResultByStudentId(studentId);
}
