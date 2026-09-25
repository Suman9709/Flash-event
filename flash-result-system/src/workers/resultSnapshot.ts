import { closeRedis, connectRedis } from "../config/redis.js";
import { closePool, pool } from "../db/pool.js";
import {
  writeResultSnapshots,
  type ResultSnapshotSource,
} from "../modules/results/result.cache.js";

async function rebuildResultSnapshot(): Promise<void> {
  await connectRedis();

  const results = await pool.query<ResultSnapshotSource>(`
    SELECT
      student.id::integer AS "studentId",
      student.roll_number AS "rollNumber",
      student.name,
      marks.english::float8 AS english,
      marks.physics::float8 AS physics,
      marks.chemistry::float8 AS chemistry,
      marks.math::float8 AS math,
      marks.hindi::float8 AS hindi,
      marks.total_marks::float8 AS "totalMarks",
      marks.percentage::float8 AS percentage
    FROM accounts_students AS student
    INNER JOIN results_result AS marks
      ON marks.student_id = student.id
    WHERE student.is_active = true
    ORDER BY student.id
  `);

  await writeResultSnapshots(results.rows);

  console.log(`Result snapshot rebuilt for ${results.rows.length} students.`);
}

void rebuildResultSnapshot()
  .catch((error: unknown) => {
    console.error("Result snapshot rebuild failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeRedis();
    await closePool();
  });