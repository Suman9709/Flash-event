import { Router } from "express";
import { consumeAdmissionTicket } from "../../middleware/consumeAdmissionTicket.js";
import { login, logout } from "./auth.controller.js";
import { loginRateLimit } from "../../middleware/loginRateLimit.js";

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, consumeAdmissionTicket, login);
authRouter.post("/logout", logout);
