import { redis } from "../../config/redis.js";
import type { StudentResult } from "./result.types.js";

export type ResultSnapshotSource = StudentResult & {
  studentId: number;
};

const snapshotBatchSize = 500;

function getResultCacheKey(studentId: number): string {
  return `result:${studentId}`;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStudentResult(value: unknown): value is StudentResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Record<string, unknown>;

  return (
    typeof result.rollNumber === "string" &&
    typeof result.name === "string" &&
    isNumber(result.english) &&
    isNumber(result.physics) &&
    isNumber(result.chemistry) &&
    isNumber(result.math) &&
    isNumber(result.hindi) &&
    isNumber(result.totalMarks) &&
    isNumber(result.percentage)
  );
}

export async function writeResultSnapshots(results: ResultSnapshotSource[]): Promise<void> {
  for (let batchStartIndex = 0; batchStartIndex < results.length; batchStartIndex += snapshotBatchSize) {
    const resultBatch = results.slice(batchStartIndex, batchStartIndex + snapshotBatchSize);
    const redisPipeline = redis.multi();

    for (const result of resultBatch) {
      const cachedResult: StudentResult = {
        rollNumber: result.rollNumber,
        name: result.name,
        english: Number(result.english),
        physics: Number(result.physics),
        chemistry: Number(result.chemistry),
        math: Number(result.math),
        hindi: Number(result.hindi),
        totalMarks: Number(result.totalMarks),
        percentage: Number(result.percentage),
      };

      redisPipeline.set(
        getResultCacheKey(result.studentId),
        JSON.stringify(cachedResult),
      );
    }

    await redisPipeline.exec();
  }
}

export async function findCachedResultByStudentId(
  studentId: number,
): Promise<StudentResult | null> {
  const cachedValue = await redis.get(getResultCacheKey(studentId));

  if (!cachedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(cachedValue);

    return isStudentResult(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}
