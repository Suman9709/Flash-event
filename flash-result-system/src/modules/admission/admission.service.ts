import { env } from "../../config/env.js";
import {
  createAdmissionTicket,
  tryConsumeAdmissionCapacity,
} from "./admission.cache.js";
import type { AdmissionResponse } from "./admission.types.js";

export async function requestAdmission(): Promise<AdmissionResponse> {
  const decision = await tryConsumeAdmissionCapacity();

  if (!decision.admitted) {
    return {
      status: "rejected",
      retryAfterSeconds: decision.retryAfterSeconds,
    };
  }

  const ticket = await createAdmissionTicket();

  return {
    status: "admitted",
    ticket,
    expiresInSeconds: env.admissionTicketTtlSeconds,
    remainingTokens: decision.remainingTokens,
  };
}
