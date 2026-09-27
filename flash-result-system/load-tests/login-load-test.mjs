import "dotenv/config";
import { request as httpRequest } from "node:http";
import { Pool } from "pg";

const requestCount = positiveInteger("LOAD_TEST_REQUESTS", 5000);
const concurrency = positiveInteger("LOAD_TEST_CONCURRENCY", 50);
const apiBaseUrl = (process.env.LOAD_TEST_API_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const allowAdmissionRejections = process.env.LOAD_TEST_ALLOW_ADMISSION_REJECTIONS === "true";

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

function postJson(path, body, localAddress, additionalHeaders = {}) {
  const requestBody = JSON.stringify(body);

  return new Promise((resolve) => {
    const request = httpRequest(
      `${apiBaseUrl}${path}`,
      {
        method: "POST",
        localAddress,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
          ...additionalHeaders,
        },
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          let data = null;

          try {
            data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            // A non-JSON error response is still reported by its HTTP status.
          }

          resolve({
            status: response.statusCode ?? 0,
            data,
          });
        });
      },
    );

    request.on("error", (error) => {
      resolve({
        status: 0,
        error: error.message,
      });
    });

    request.end(requestBody);
  });
}

async function login(student, localAddress) {
  const startedAt = performance.now();
  const admission = await postJson("/api/v1/admission/enter", {}, localAddress);
  const ticket = admission.data?.ticket;

  if (admission.status !== 201 || typeof ticket !== "string") {
    return {
      stage: "admission",
      status: admission.status,
      durationMs: performance.now() - startedAt,
      error: admission.error,
    };
  }

  const loginResponse = await postJson(
    "/api/v1/auth/login",
    {
      rollNumber: student.rollNumber,
      dob: student.dob,
    },
    localAddress,
    {
      "X-Admission-Ticket": ticket,
    },
  );

  return {
    stage: "login",
    status: loginResponse.status,
    durationMs: performance.now() - startedAt,
    error: loginResponse.error,
  };
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
  const stageStatusCounts = Object.fromEntries(
    [...new Set(results.map((result) => `${result.stage}:${result.status}`))]
      .sort()
      .map((stageStatus) => [
        stageStatus,
        results.filter((result) => `${result.stage}:${result.status}` === stageStatus).length,
      ]),
  );
  const failedRequests = results.filter(
    (result) =>
      result.status !== 200 &&
      !(
        allowAdmissionRejections &&
        result.stage === "admission" &&
        result.status === 429
      ),
  );

  console.log(
    JSON.stringify(
      {
        requests: requestCount,
        concurrency,
        durationMs: Number(totalDurationMs.toFixed(2)),
        requestsPerSecond: Number(((requestCount / totalDurationMs) * 1000).toFixed(2)),
        statusCounts,
        stageStatusCounts,
        successfulRequests: successfulRequests.length,
        admissionRejections: results.filter(
          (result) => result.stage === "admission" && result.status === 429,
        ).length,
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
