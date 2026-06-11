import { Router } from "express";
import * as controller from "./entry.controller";

const r = Router();

// Rotas públicas de autenticação
r.post("/auth/register", controller.register);
r.post("/auth/login", controller.login);
r.post("/auth/refresh", controller.refreshSession);

export default r;
