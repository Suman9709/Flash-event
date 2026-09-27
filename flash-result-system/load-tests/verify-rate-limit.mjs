import "dotenv/config";
import { Pool } from "pg";
import { createClient } from "redis";

const apiBaseUrl = (process.env.LOAD_TEST_API_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createAdmissionTicket() {
  const response = await fetch(`${apiBaseUrl}/api/v1/admission/enter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const data = await response.json();

  if (response.status !== 201 || typeof data.ticket !== "string") {
    throw new Error(`Admission request returned ${response.status}`);
  }

  return data.ticket;
}

let student;

try {
  const students = await pool.query(
    `
      SELECT
        roll_number AS "rollNumber",
        date_of_birth::text AS dob
      FROM accounts_students
      WHERE is_active = true
      ORDER BY id
      LIMIT 1
    `,
  );

  student = students.rows[0];

  if (!student) {
    throw new Error("No active student is available for the rate-limit test");
  }

  const statuses = [];

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const ticket = await createAdmissionTicket();
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admission-Ticket": ticket,
      },
      body: JSON.stringify(student),
    });

    statuses.push(response.status);
    await wait(30);
  }

  const expectedStatuses = [200, 200, 200, 200, 200, 429];

  console.log(
    JSON.stringify(
      {
        statuses,
        expectedStatuses,
        passed: JSON.stringify(statuses) === JSON.stringify(expectedStatuses),
      },
      null,
      2,
    ),
  );
} finally {
  if (student) {
    await redis.connect();
    await redis.del(
      "rate-limit:login:ip:127.0.0.1",
      `rate-limit:login:roll:${encodeURIComponent(student.rollNumber)}`,
    );
    await redis.quit();
  }

  await pool.end();
}
