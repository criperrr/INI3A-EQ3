import { Router } from "express";
import { productController } from "./product.controller";
import { requireAuth, requireAdmin } from "@/shared/middlewares/authMiddleware";
import { searchRateLimiter } from "@/shared/middlewares/rateLimiter";
import { cacheResponse } from "@/shared/middlewares/cacheMiddleware";

const router = Router();

router.get("/", cacheResponse({ ttlSeconds: 60, clientMaxAge: 30 }), productController.getAllProducts);
router.get("/categories", cacheResponse({ ttlSeconds: 3600, clientMaxAge: 1800 }), productController.getCategories);
router.get("/categories/details", cacheResponse({ ttlSeconds: 3600, clientMaxAge: 1800 }), productController.getPredefinedCategories);
router.get("/types", cacheResponse({ ttlSeconds: 3600, clientMaxAge: 1800 }), productController.getPredefinedCategories);
router.get("/barcode/:ean", searchRateLimiter, cacheResponse({ ttlSeconds: 600, clientMaxAge: 300 }), productController.getProductByBarcode);
router.get("/barcode", searchRateLimiter, cacheResponse({ ttlSeconds: 600, clientMaxAge: 300 }), productController.getProductByBarcode);
router.get("/:id", cacheResponse({ ttlSeconds: 120, clientMaxAge: 60 }), productController.getProductById);
router.get("/:id/history", cacheResponse({ ttlSeconds: 120, clientMaxAge: 60 }), productController.getPriceHistory);
router.post("/:id/report", requireAuth as any, productController.reportProduct as any);
router.post("/custom", requireAuth as any, productController.createCustomProduct);
router.post("/", requireAuth as any, productController.createCustomProduct);
router.put("/:id", requireAdmin as any, productController.updateProduct);
router.patch("/:id", requireAdmin as any, productController.updateProduct);
router.delete("/:id", requireAdmin as any, productController.deleteProduct);

export default router;


