import { env } from "../config/env.js";

type LogFields = Record<string, unknown>;

function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  return {
    errorMessage: String(error),
  };
}

function writeLog(level: "info" | "error", event: string, fields: LogFields = {}): void {
  console[level](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      service: "flash-result-api",
      instanceId: env.appInstanceId,
      ...fields,
    }),
  );
}

export function logInfo(event: string, fields?: LogFields): void {
  writeLog("info", event, fields);
}

export function logError(event: string, error: unknown, fields?: LogFields): void {
  writeLog("error", event, {
    ...fields,
    ...serializeError(error),
  });
}
