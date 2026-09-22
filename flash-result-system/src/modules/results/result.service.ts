import { pool } from "../../db/pool.js";
import type { StudentResult } from "./result.types.js";

export async function findResultByStudentId(studentId: number): Promise<StudentResult | null> {
  const result = await pool.query<StudentResult>(
    `
      SELECT
        student.roll_number AS "rollNumber",
        student.name,
        marks.english,
        marks.physics,
        marks.chemistry,
        marks.math,
        marks.hindi,
        marks.total_marks AS "totalMarks",
        marks.percentage::float8 AS percentage
      FROM accounts_students AS student
      INNER JOIN results_result AS marks ON marks.student_id = student.id
      WHERE student.id = $1
        AND student.is_active = true
      LIMIT 1
    `,
    [studentId],
  );

  return result.rows[0] ?? null;
}
