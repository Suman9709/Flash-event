export type AdmissionResponse =
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
  | {
      status: "rejected";
      retryAfterSeconds: number;
    };

export type AdmissionRequestStatus =
  | {
      status: "waiting";
    }
  | {
      status: "admitted";
      ticket: string;
      expiresInSeconds: number;
    };
