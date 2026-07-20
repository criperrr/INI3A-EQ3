import { Router } from "express";
import { authController } from "./auth.controller";

const r = Router();

r.post("/register", authController.createUser);


export default r;