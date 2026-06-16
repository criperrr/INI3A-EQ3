import { Router } from "express";
import * as controller from "./entry.controller";
import { authenticateSession } from "../auth/auth.controller";

const r = Router();

// Rotas públicas de autenticação
r.post("/auth/register", controller.register);
r.post("/auth/login", controller.login);
r.post("/auth/refresh", controller.refreshSession);

// Ocorrências de preço
r.post("/entries", authenticateSession, controller.createEntry);

export default r;
