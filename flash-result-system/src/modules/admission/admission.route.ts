import { Router } from "express";
import { enterAdmission, getAdmissionStatus } from "./admission.controller.js";

export const admissionRouter = Router();

admissionRouter.post("/enter", enterAdmission);
admissionRouter.get("/requests/:requestId", getAdmissionStatus);
