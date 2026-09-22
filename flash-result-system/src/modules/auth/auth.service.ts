import { pool } from "../../db/pool.js";
import type { AuthenticatedStudent } from "./auth.types.js";

export async function authenticateStudent(
  rollNumber: string,
  dob: string,
): Promise<AuthenticatedStudent | null> {
  const result = await pool.query<AuthenticatedStudent>(
    `
      SELECT
        id,
        roll_number AS "rollNumber",
        name
      FROM accounts_students
      WHERE roll_number = $1
        AND date_of_birth = $2
        AND is_active = true
      LIMIT 1
    `,
    [rollNumber, dob],
  );

  return result.rows[0] ?? null;
}
