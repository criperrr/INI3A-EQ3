import { Router } from "express";
import { productController } from "./product.controller";

const router = Router();

router.get("/", productController.listProducts);
router.get("/barcode/:ean", productController.getProductByBarcode);
router.get("/:id", productController.getProductById);
router.post("/", productController.createProduct);
router.post("/custom", productController.createCustomProduct);
router.put("/:id", productController.updateProduct);
router.patch("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

export default router;

