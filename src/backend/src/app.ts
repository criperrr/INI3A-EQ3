import express from "express";
import authRouter from "./modules/auth/auth.routes";
import apiStatus from "./modules/status/apiStatus";
import entryRouter from "./modules/entry/entry.routes";
import { globalErrorHandling } from "./shared/middlewares/errorHandler";

const app = express();

app.get("/api", apiStatus);
app.use(express.json());
app.use("/api/v1", entryRouter);
app.use(authRouter);
app.use(globalErrorHandling);

export default app;
