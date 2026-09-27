import {
  admitOrQueue,
  findAdmissionRequestStatus,
} from "./admission.cache.js";
import type {
  AdmissionRequestStatus,
  AdmissionResponse,
} from "./admission.types.js";

export async function requestAdmission(): Promise<AdmissionResponse> {
  return admitOrQueue();
}

export async function getAdmissionRequestStatus(
  requestId: string,
): Promise<AdmissionRequestStatus | null> {
  return findAdmissionRequestStatus(requestId);
}
