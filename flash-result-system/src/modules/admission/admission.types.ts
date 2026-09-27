export type TokenBucketDecision =
  | {
      admitted: true;
      remainingTokens: number;
    }
  | {
      admitted: false;
      retryAfterSeconds: number;
    };

export type AdmissionResponse =
  | {
      status: "admitted";
      ticket: string;
      expiresInSeconds: number;
      remainingTokens: number;
    }
  | {
      status: "rejected";
      retryAfterSeconds: number;
    };
