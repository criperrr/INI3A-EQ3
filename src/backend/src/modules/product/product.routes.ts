import { Router } from "express";
import { productController } from "./product.controller";
import { requireAuth, requireAdmin } from "@/shared/middlewares/authMiddleware";
import { searchRateLimiter } from "@/shared/middlewares/rateLimiter";

const router = Router();

router.get("/", productController.getAllProducts);
router.get("/categories", productController.getCategories);
router.get("/categories/details", productController.getPredefinedCategories);
router.get("/types", productController.getPredefinedCategories);
router.get("/barcode/:ean", searchRateLimiter, productController.getProductByBarcode);
router.get("/barcode", searchRateLimiter, productController.getProductByBarcode);
router.get("/:id", productController.getProductById);
router.get("/:id/history", productController.getPriceHistory);
router.post("/:id/report", requireAuth as any, productController.reportProduct as any);
router.post("/custom", requireAuth as any, productController.createCustomProduct);
router.post("/", requireAuth as any, productController.createCustomProduct);
router.put("/:id", requireAdmin as any, productController.updateProduct);
router.patch("/:id", requireAdmin as any, productController.updateProduct);
router.delete("/:id", requireAdmin as any, productController.deleteProduct);

export default router;


