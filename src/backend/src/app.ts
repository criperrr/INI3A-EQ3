import express from "express";
import authRouter from "./modules/auth/auth.routes";
import ping from "./modules/status/ping";


const app = express();

app.get('/ping', ping);
app.use(express.json())
app.use("/api/v1/auth", authRouter);

export default app;
