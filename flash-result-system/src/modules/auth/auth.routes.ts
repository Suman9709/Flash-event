import { Router } from "express";
import { login, logout } from "./auth.controller.js";
import { loginRateLimit } from "../../middleware/loginRateLimit.js";

export const authRouter = Router();

authRouter.post("/login",loginRateLimit, login);
authRouter.post("/logout", logout);
