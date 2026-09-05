import { Router } from "express";
import { imageOptimizerController } from "./image.controller";

const router = Router();

router.get("/optimize", imageOptimizerController.optimize.bind(imageOptimizerController));

export default router;
