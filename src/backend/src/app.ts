import express from "express";
import authRouter from "./modules/auth/auth.routes";
import entryRouter from './modules/entry/entry.routes';
import apiStatus from "./modules/status/apiStatus";


const app = express();

app.get("/", apiStatus);
app.use(express.json())
app.use("/api/v1/auth", authRouter, entryRouter);

export default app;
