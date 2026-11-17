import { Router } from "express";
import { imageOptimizerController } from "./image.controller";
import { heavyComputeRateLimiter } from "@/shared/middlewares/rateLimiter";
import { PRESCO_LOGO_DARK_PNG, PRESCO_LOGO_LIGHT_PNG } from "@/shared/util/brandLogo";

const router = Router();

router.get("/brand-logo", (req, res) => {
  const mode = String(req.query.mode || "light").toLowerCase();
  const buf = mode === "dark" || mode === "amoled" ? PRESCO_LOGO_DARK_PNG : PRESCO_LOGO_LIGHT_PNG;
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(buf);
});

router.get(
  "/optimize",
  heavyComputeRateLimiter,
  imageOptimizerController.optimize.bind(imageOptimizerController),
);

export default router;
