import { Router } from "express";
import { authController } from "./auth.controller";
import { requireAuth } from "@/shared/middlewares/authMiddleware";
import { authRateLimiter } from "@/shared/middlewares/rateLimiter";

const r = Router();

r.post("/register", authRateLimiter, authController.register);
r.post("/login", authRateLimiter, authController.login);
r.post("/refresh", authController.refresh);
r.get("/me", requireAuth as any, authController.getMe);
r.post("/logout", requireAuth as any, authController.logout);
r.post("/2fa/send", requireAuth as any, authRateLimiter, authController.sendTwoFactorCode as any);
r.post("/2fa/verify", requireAuth as any, authRateLimiter, authController.verifyTwoFactorCode as any);
r.patch("/password", requireAuth as any, authRateLimiter, authController.changePassword);
r.delete("/account", requireAuth as any, authController.deleteAccount);

export default r;