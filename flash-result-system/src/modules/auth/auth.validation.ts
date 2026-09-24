export type ValidatedLogin = {
  rollNumber: string;
  dob: string;
};

export type LoginValidationResult =
  | { success: true; data: ValidatedLogin }
  | { success: false; message: string };

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const maximumRollNumberLength = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidIsoDate(value: string): boolean {
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateLoginBody(body: unknown): LoginValidationResult {
  if (!isRecord(body)) {
    return {
      success: false,
      message: "A JSON body with rollNumber and dob is required",
    };
  }

  const { rollNumber, dob } = body;

  if (typeof rollNumber !== "string" || !rollNumber.trim()) {
    return {
      success: false,
      message: "rollNumber is required",
    };
  }

  const normalizedRollNumber = rollNumber.trim();

  if (normalizedRollNumber.length > maximumRollNumberLength) {
    return {
      success: false,
      message: "rollNumber is too long",
    };
  }

  if (typeof dob !== "string" || !isValidIsoDate(dob)) {
    return {
      success: false,
      message: "dob must be a valid date in YYYY-MM-DD format",
    };
  }

  return {
    success: true,
    data: {
      rollNumber: normalizedRollNumber,
      dob,
    },
  };
}
