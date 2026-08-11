import { Router } from "express";
import { productController } from "./product.controller";

const router = Router();

router.get("/barcode/:ean", productController.getProductByBarcode);
router.post("/custom", productController.createCustomProduct);

export default router;
