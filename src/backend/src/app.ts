import e from "express";
import { errorHandler } from "@/shared/middlewares/errorHandler";
import * as authRouter from "@/modules/auth/auth.routes";
const app = e();

app.use(e.json());
app.use("/api/v1", (_, res) => {
  return res.status(200).json({ message: "API is running!" });
});
app.use("/auth", authRouter.default);

app.use(errorHandler);

export default app;
