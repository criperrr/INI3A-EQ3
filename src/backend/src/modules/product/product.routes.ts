import { Router } from "express";
import { productController } from "./product.controller";

const router = Router();

// Rota GET /api/products/barcode/:ean
router.get("/barcode/:ean", productController.getProductByBarcode);

export default router;
