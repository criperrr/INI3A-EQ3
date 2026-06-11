import express from "express";
import authMiddlewareRouter from "./modules/auth/auth.routes";
import entryRouter from "./modules/entry/entry.routes";
import meRouter from "./modules/me/me.routes";
import marketRouter from "./modules/market/market.routes";
import productRouter from "./modules/product/product.routes";
import apiStatus from "./modules/status/apiStatus";
import { globalErrorHandling } from "./shared/middlewares/errorHandler";

const app = express();

app.use(express.json());

// Status check — público
app.get("/api", apiStatus);

// Rotas públicas de autenticação (sem middleware JWT)
app.use("/api/v1", entryRouter);

// Rotas de produtos (possui caminhos públicos e protegidos internamente)
app.use("/api/v1/products", productRouter);

// Middleware JWT — todas as rotas abaixo exigem autenticação
app.use(authMiddlewareRouter);

// Rotas protegidas
app.use("/api/v1/me", meRouter);
app.use("/api/v1/markets", marketRouter);

// Handler global de erros (deve ser o último)
app.use(globalErrorHandling);

export default app;
