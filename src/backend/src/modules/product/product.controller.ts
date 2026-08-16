import type { NextFunction, Request, Response } from "express";
import { productService } from "./product.service";
import { UserRepository } from "@/shared/database/repositories/user.repository";
import { success } from "@/shared/helpers/response.helper";
import { ValidationError } from "@/shared/errors/errors";

class ProductControllerClass {
  async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, category, page, limit, sortBy, sortOrder } = req.query;

      const result = await productService.listProducts({
        search: typeof search === "string" ? search : undefined,
        category: typeof category === "string" ? category : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy: (sortBy as "name" | "createdAt" | "id") || "id",
        sortOrder: (sortOrder as "asc" | "desc") || "desc",
      });

      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const numId = Number(id);

      const errors: Array<{ field: string; message: string }> = [];
      if (!id || isNaN(numId) || numId <= 0) {
        errors.push({ field: "id", message: "ID do produto inválido." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const product = await productService.getProductById(numId);
      return res.status(200).json(success(product));
    } catch (e) {
      next(e);
    }
  }

  async getProductByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const ean = typeof req.params.ean === "string" ? req.params.ean.trim() : "";

      const errors: Array<{ field: string; message: string }> = [];
      if (!ean) {
        errors.push({ field: "ean", message: "O código de barras (EAN) é obrigatório." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const product = await productService.getProductByBarcode(ean);

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
      const { name, category, description, icon, ean, ncm } = req.body;

      const errors: Array<{ field: string; message: string }> = [];
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        errors.push({ field: "name", message: "O nome do produto é obrigatório." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const product = await productService.createCustomProduct({
        name: name.trim(),
        category,
        description,
        icon,
        ean,
        ncm,
      });

      if ((req as any).user?.id) {
        await UserRepository.incrementPoints((req as any).user.id, 25).catch(() => {});
      }

      return res.status(201).json(success(product));
    } catch (e) {
      next(e);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const numId = Number(id);
      const { name, category, description, icon, ean, ncm } = req.body;

      const errors: Array<{ field: string; message: string }> = [];
      if (!id || isNaN(numId) || numId <= 0) {
        errors.push({ field: "id", message: "ID do produto inválido." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const updated = await productService.updateProduct(numId, {
        name,
        category,
        description,
        icon,
        ean,
        ncm,
      });

      return res.status(200).json(success(updated));
    } catch (e) {
      next(e);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const numId = Number(id);

      const errors: Array<{ field: string; message: string }> = [];
      if (!id || isNaN(numId) || numId <= 0) {
        errors.push({ field: "id", message: "ID do produto inválido." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      await productService.deleteProduct(numId);

      return res.status(200).json(success({ deleted: true, id: numId }));
    } catch (e) {
      next(e);
    }
  }

  async getCategories(_: Request, res: Response, next: NextFunction) {
    try {
      const categories = await productService.getCategories();
      return res.status(200).json(success(categories));
    } catch (e) {
      next(e);
    }
  }

  async getPriceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const numId = Number(id);

      const errors: Array<{ field: string; message: string }> = [];
      if (!id || isNaN(numId) || numId <= 0) {
        errors.push({ field: "id", message: "ID do produto inválido." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const history = await productService.getPriceHistory(numId);
      return res.status(200).json(success(history));
    } catch (e) {
      next(e);
    }
  }
}

export const productController = new ProductControllerClass();

