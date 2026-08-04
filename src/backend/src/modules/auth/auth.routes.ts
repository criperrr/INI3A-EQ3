import { Router } from "express";
import { authController } from "./auth.controller";
import { requireAuth } from "@/shared/middlewares/authMiddleware";

const r = Router();

r.post("/register", authController.register);
r.post("/login", authController.login);
r.post("/refresh", authController.refresh);
r.post("/logout", requireAuth as any, authController.logout);
r.delete("/account", requireAuth as any, authController.deleteAccount);

export default r;