import { Router } from "express";
import { productController } from "./product.controller";
import { requireAuth, requireAdmin, requireTwoFactor, optionalAuth } from "@/shared/middlewares/authMiddleware";
import { searchRateLimiter, writeRateLimiter } from "@/shared/middlewares/rateLimiter";
import { cacheResponse } from "@/shared/middlewares/cacheMiddleware";

const router = Router();

router.get("/", searchRateLimiter, cacheResponse({ ttlSeconds: 60, clientMaxAge: 30 }), productController.getAllProducts);
router.get("/admin/pending", searchRateLimiter, requireAuth as any, requireAdmin as any, productController.getPendingProducts as any);
router.post("/:id/approve", writeRateLimiter, requireAuth as any, requireAdmin as any, productController.approveProduct as any);
router.post("/:id/reject", writeRateLimiter, requireAuth as any, requireAdmin as any, productController.rejectProduct as any);
router.get("/categories", searchRateLimiter, cacheResponse({ ttlSeconds: 3600, clientMaxAge: 1800 }), productController.getCategories);
router.get("/categories/details", searchRateLimiter, cacheResponse({ ttlSeconds: 3600, clientMaxAge: 1800 }), productController.getPredefinedCategories);
router.get("/types", searchRateLimiter, cacheResponse({ ttlSeconds: 3600, clientMaxAge: 1800 }), productController.getPredefinedCategories);
router.get("/validate-existence", searchRateLimiter, productController.validateProductExistence);
router.get("/barcode/:ean", searchRateLimiter, productController.getProductByBarcode);
router.get("/barcode", searchRateLimiter, productController.getProductByBarcode);
router.get("/:id", searchRateLimiter, optionalAuth as any, cacheResponse({ ttlSeconds: 120, clientMaxAge: 60 }), productController.getProductById);
router.get("/:id/history", searchRateLimiter, cacheResponse({ ttlSeconds: 120, clientMaxAge: 60 }), productController.getPriceHistory);
router.post("/:id/report", writeRateLimiter, requireTwoFactor as any, productController.reportProduct as any);
router.post("/purge-all", writeRateLimiter, requireAdmin as any, productController.purgeAllProducts);
router.post("/custom", writeRateLimiter, requireTwoFactor as any, productController.createCustomProduct);
router.post("/", writeRateLimiter, requireTwoFactor as any, productController.createCustomProduct);
router.put("/:id", writeRateLimiter, requireAdmin as any, productController.updateProduct);
router.patch("/:id", writeRateLimiter, requireAdmin as any, productController.updateProduct);
router.delete("/:id", writeRateLimiter, requireAdmin as any, productController.deleteProduct);

export default router;
