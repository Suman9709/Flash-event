import "dotenv/config";
import { request as httpRequest } from "node:http";
import { Pool } from "pg";

const requestCount = positiveInteger("LOAD_TEST_REQUESTS", 5000);
const concurrency = positiveInteger("LOAD_TEST_CONCURRENCY", 50);
const apiBaseUrl = (process.env.LOAD_TEST_API_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

function positiveInteger(name, defaultValue) {
  const value = Number(process.env[name] ?? defaultValue);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function loopbackAddress(index) {
  const addressNumber = index + 1;
  const thirdOctet = Math.floor((addressNumber - 1) / 254);
  const fourthOctet = ((addressNumber - 1) % 254) + 1;

  return `127.0.${thirdOctet}.${fourthOctet}`;
}

function percentile(values, percentileValue) {
  const index = Math.ceil((percentileValue / 100) * values.length) - 1;
  return values[Math.max(0, index)];
}

function login(student, localAddress) {
  const body = JSON.stringify({
    rollNumber: student.rollNumber,
    dob: student.dob,
  });
  const startedAt = performance.now();

  return new Promise((resolve) => {
    const request = httpRequest(
      `${apiBaseUrl}/api/v1/auth/login`,
      {
        method: "POST",
        localAddress,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            durationMs: performance.now() - startedAt,
          });
        });
      },
    );

    request.on("error", (error) => {
      resolve({
        status: 0,
        durationMs: performance.now() - startedAt,
        error: error.message,
      });
    });

    request.end(body);
  });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const studentsResult = await pool.query(
    `
      SELECT
        roll_number AS "rollNumber",
        date_of_birth::text AS dob
      FROM accounts_students
      WHERE is_active = true
      ORDER BY id
      LIMIT $1
    `,
    [requestCount],
  );

  if (studentsResult.rows.length < requestCount) {
    throw new Error(
      `The database has ${studentsResult.rows.length} active students; ${requestCount} are required.`,
    );
  }

  const results = new Array(requestCount);
  let nextIndex = 0;
  const startedAt = performance.now();

  async function worker() {
    while (nextIndex < requestCount) {
      const index = nextIndex;
      nextIndex += 1;

      results[index] = await login(studentsResult.rows[index], loopbackAddress(index));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, worker));

  const totalDurationMs = performance.now() - startedAt;
  const successfulRequests = results.filter((result) => result.status === 200);
  const latencies = successfulRequests
    .map((result) => result.durationMs)
    .sort((first, second) => first - second);
  const statusCounts = Object.fromEntries(
    [...new Set(results.map((result) => result.status))]
      .sort((first, second) => first - second)
      .map((status) => [status, results.filter((result) => result.status === status).length]),
  );
  const failedRequests = results.filter((result) => result.status !== 200);

  console.log(
    JSON.stringify(
      {
        requests: requestCount,
        concurrency,
        durationMs: Number(totalDurationMs.toFixed(2)),
        requestsPerSecond: Number(((requestCount / totalDurationMs) * 1000).toFixed(2)),
        statusCounts,
        successfulRequests: successfulRequests.length,
        latencyMs:
          latencies.length === 0
            ? null
            : {
                min: Number(latencies[0].toFixed(2)),
                mean: Number(
                  (latencies.reduce((total, value) => total + value, 0) / latencies.length).toFixed(2),
                ),
                p50: Number(percentile(latencies, 50).toFixed(2)),
                p95: Number(percentile(latencies, 95).toFixed(2)),
                p99: Number(percentile(latencies, 99).toFixed(2)),
                max: Number(latencies.at(-1).toFixed(2)),
              },
        failures: failedRequests.slice(0, 5),
      },
      null,
      2,
    ),
  );

  if (failedRequests.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}
