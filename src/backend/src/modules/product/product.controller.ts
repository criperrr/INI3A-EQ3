import type { NextFunction, Request, Response } from "express";
import { productService } from "./product.service";
import { success } from "@/shared/helpers/response.helper";
import { ValidationError, ConflictError, NotFoundError } from "@/shared/errors/errors";

class ProductControllerClass {
  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;

      const products = await productService.listProducts({ search, limit, offset });
      return res.status(200).json(success(products));
    } catch (e) {
      next(e);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const errors: Array<{ field: string; message: string }> = [];
      if (!id || isNaN(id)) {
        errors.push({ field: "id", message: "ID do produto inválido." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const product = await productService.getProductById(id);
      return res.status(200).json(success(product));
    } catch (e) {
      next(e);
    }
  }

  async getProductByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const { ean } = req.params;

      const errors: Array<{ field: string; message: string }> = [];
      if (!ean) errors.push({ field: "ean", message: "O código de barras (EAN) é obrigatório." });

      if (errors.length > 0) throw new ValidationError(errors);

      const product = await productService.getProductByBarcode(ean as string);

      if (!product) {
        throw new NotFoundError("Produto não encontrado na base de dados.");
      }

      return res.status(200).json(success(product));
    } catch (e) {
      next(e);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, ean, ncm, description, icon } = req.body;

      const errors: Array<{ field: string; message: string }> = [];
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        errors.push({ field: "name", message: "O nome do produto é obrigatório." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const product = await productService.createProduct({
        name: name.trim(),
        ean: ean ? String(ean).trim() : undefined,
        ncm: ncm ? String(ncm).trim() : undefined,
        description: description ? String(description).trim() : undefined,
        icon: icon ? String(icon).trim() : undefined,
      });

      return res.status(201).json(success(product));
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

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const errors: Array<{ field: string; message: string }> = [];
      if (!id || isNaN(id)) {
        errors.push({ field: "id", message: "ID do produto inválido." });
      }

      const { name, ean, ncm, description, icon } = req.body;
      if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
        errors.push({ field: "name", message: "O nome do produto não pode ser vazio." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      const product = await productService.updateProduct(id, {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(ean !== undefined ? { ean: ean ? String(ean).trim() : null } : {}),
        ...(ncm !== undefined ? { ncm: ncm ? String(ncm).trim() : null } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : "" } : {}),
        ...(icon !== undefined ? { icon: icon ? String(icon).trim() : "" } : {}),
      });

      return res.status(200).json(success(product));
    } catch (e) {
      next(e);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const errors: Array<{ field: string; message: string }> = [];
      if (!id || isNaN(id)) {
        errors.push({ field: "id", message: "ID do produto inválido." });
      }

      if (errors.length > 0) throw new ValidationError(errors);

      await productService.deleteProduct(id);
      return res.status(200).json(success({ message: "Produto excluído com sucesso." }));
    } catch (e) {
      next(e);
    }
  }
}

export const productController = new ProductControllerClass();

