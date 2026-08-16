import { Router } from "express";
import { productController } from "./product.controller";
import { requireAdmin } from "@/shared/middlewares/authMiddleware";

const router = Router();

router.get("/", productController.getAllProducts);
router.get("/categories", productController.getCategories);
router.get("/barcode/:ean", productController.getProductByBarcode);
router.get("/:id", productController.getProductById);
router.get("/:id/history", productController.getPriceHistory);
router.post("/custom", productController.createCustomProduct);
router.post("/", productController.createCustomProduct);
router.put("/:id", requireAdmin as any, productController.updateProduct);
router.patch("/:id", requireAdmin as any, productController.updateProduct);
router.delete("/:id", requireAdmin as any, productController.deleteProduct);

export default router;


