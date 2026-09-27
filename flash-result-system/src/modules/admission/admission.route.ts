import { Router } from "express";
import { enterAdmission } from "./admission.controller.js";

export const admissionRouter = Router();

admissionRouter.post("/enter", enterAdmission);
