import e from "express";
import cors from "cors";
import { errorHandler } from "@/shared/middlewares/errorHandler";
import authRouter from "@/modules/auth/auth.routes";
import productRouter from "@/modules/product/product.routes";

const app = e();

app.use(cors());
app.use(e.json());

app.use("/api/v1", (_, res) => {
  return res.status(200).json({ message: "API is running!" });
});

app.use("/auth", authRouter);
app.use("/products", productRouter);

app.use(errorHandler);

export default app;
