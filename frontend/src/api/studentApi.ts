
import axios from "axios";

type Mark = number | string;

export type StudentResult = {
  rollNumber: string;
  name: string;
  english: Mark;
  physics: Mark;
  chemistry: Mark;
  math: Mark;
  hindi: Mark;
  totalMarks: Mark;
  percentage: number;
};

type LoginResponse = {
  success: true;
  expiresIn: number;
  student: {
    rollNumber: string;
    name: string;
  };
};

type AdmissionResponse = {
  success: true;
} & (
  | {
      status: "admitted";
      ticket: string;
      expiresInSeconds: number;
      remainingTokens: number;
    }
  | {
      status: "waiting";
      requestId: string;
      expiresInSeconds: number;
      queuePosition: number;
    }
);

type AdmissionStatusResponse =
  | {
      success: true;
      status: "waiting";
    }
  | {
      success: true;
      status: "admitted";
      ticket: string;
      expiresInSeconds: number;
    };

type ResultResponse = {
  success: true;
  result: StudentResult;
};

const studentApi = axios.create({
  // Nginx is the public API entry point in the local replica setup. Set
  // VITE_API_BASE_URL to use a deployed domain or a different environment.
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getAdmissionTicket(): Promise<string> {
  const admission = await studentApi.post<AdmissionResponse>("/admission/enter");

  if (admission.data.status === "admitted") {
    return admission.data.ticket;
  }

  const expiresAt = Date.now() + admission.data.expiresInSeconds * 1000;

  while (Date.now() < expiresAt) {
    await wait(1000);

    const status = await studentApi.get<AdmissionStatusResponse>(
      `/admission/requests/${admission.data.requestId}`,
    );

    if (status.data.status === "admitted") {
      return status.data.ticket;
    }
  }

  throw new Error("Your admission request expired. Please try again.");
}

export async function studentLogin(rollNumber: string, dob: string) {
  const ticket = await getAdmissionTicket();

  const response = await studentApi.post<LoginResponse>(
    "/auth/login",
    { rollNumber, dob },
    {
      headers: {
        "X-Admission-Ticket": ticket,
      },
    },
  );
  return response.data;
}

export async function studentResult() {
  const response = await studentApi.get<ResultResponse>("/results/me");
  return response.data.result;
}

export async function studentLogout() {
  await studentApi.post("/auth/logout");
}
