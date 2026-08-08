import type { Request, Response, NextFunction } from "express";
import { productService } from "./product.service";

class ProductControllerClass {
  async getProductByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const { ean } = req.params;
      
      if (!ean) {
        return res.status(400).json({
          success: false,
          code: "INVALID_REQUEST",
          message: "O código de barras (EAN) é obrigatório."
        });
      }

      const product = await productService.getProductByBarcode(ean as string);

      if (!product) {
        return res.status(404).json({
          success: false,
          code: "PRODUCT_NOT_FOUND",
          message: "Produto não encontrado na base de dados externa."
        });
      }

      return res.status(200).json({
        success: true,
        code: "SUCCESS",
        data: product
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        code: "INTERNAL_ERROR",
        message: error.message || "Erro interno do servidor."
      });
    }
  }
}

export const productController = new ProductControllerClass();
