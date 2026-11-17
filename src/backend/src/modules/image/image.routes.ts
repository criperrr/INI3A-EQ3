import { Router } from "express";
import { imageOptimizerController } from "./image.controller";
import { heavyComputeRateLimiter } from "@/shared/middlewares/rateLimiter";

const router = Router();

router.get(
  "/optimize",
  heavyComputeRateLimiter,
  imageOptimizerController.optimize.bind(imageOptimizerController),
);

export default router;
