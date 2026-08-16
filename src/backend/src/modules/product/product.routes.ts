import { Router } from "express";
import { productController } from "./product.controller";

const router = Router();

router.get("/", productController.getAllProducts);
router.get("/categories", productController.getCategories);
router.get("/barcode/:ean", productController.getProductByBarcode);
router.get("/:id", productController.getProductById);
router.get("/:id/history", productController.getPriceHistory);
router.post("/custom", productController.createCustomProduct);
router.post("/", productController.createCustomProduct);
router.put("/:id", productController.updateProduct);
router.patch("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

export default router;

