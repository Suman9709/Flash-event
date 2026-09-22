import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { getMyResult } from "./result.controller.js";

export const resultRouter = Router();

resultRouter.get("/me", authenticate, getMyResult);
