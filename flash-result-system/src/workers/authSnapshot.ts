import { closeRedis, connectRedis } from "../config/redis.js";
import { closePool, pool } from "../db/pool.js";
import {
  writeAuthSnapshots,
  type AuthSnapshotSource,
} from "../modules/auth/auth.cache.js";

async function rebuildAuthenticationSnapshot(): Promise<void> {
  await connectRedis();

  const studentsResult = await pool.query<AuthSnapshotSource>(`
    SELECT
      id::integer AS "studentId",
      roll_number AS "rollNumber",
      name,
      date_of_birth::text AS dob,
      is_active AS "isActive"
    FROM accounts_students
    ORDER BY id
  `);

  await writeAuthSnapshots(studentsResult.rows);
  console.log(`Authentication snapshot rebuilt for ${studentsResult.rows.length} students.`);
}

void rebuildAuthenticationSnapshot()
  .catch((error: unknown) => {
    console.error("Authentication snapshot rebuild failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeRedis();
    await closePool();
  });
