import type { AuthenticatedUser } from "../config/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
