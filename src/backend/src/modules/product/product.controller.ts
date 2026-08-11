import type { NextFunction, Request, Response } from "express";
import { productService } from "./product.service";
import { success } from "@/shared/helpers/response.helper";
import { ValidationError, ConflictError } from "@/shared/errors/errors";

class ProductControllerClass {
  async getProductByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const { ean } = req.params;

      const errors: Array<{ field: string; message: string }> = [];
      if (!ean) errors.push({ field: "ean", message: "O código de barras (EAN) é obrigatório." });

      if (errors.length > 0) throw new ValidationError(errors);

      const product = await productService.getProductByBarcode(ean as string);

      if (!product) {
        return res.status(404).json({
          success: false,
          code: "PRODUCT_NOT_FOUND",
          message: "Produto não encontrado na base de dados.",
        });
      }

      return res.status(200).json(success(product));
    } catch (e) {
      next(e);
    }
  }

  async createCustomProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, category, icon, ean } = req.body;

      const errors: Array<{ field: string; message: string }> = [];
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        errors.push({ field: "name", message: "O nome do produto é obrigatório." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const product = await productService.createCustomProduct({ name: name.trim(), category, icon, ean });

      return res.status(201).json(success(product));
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("já existe")) {
        return next(new ConflictError("Produto com este EAN já existe."));
      }
      next(e);
    }
  }
}

export const productController = new ProductControllerClass();
