import type { NextFunction, Response } from "express";
import { CartService } from "./cart.service";
import { success } from "@/shared/helpers/response.helper";
import { ValidationError } from "@/shared/errors/errors";

class CartControllerClass {
  async getCart(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError([{ field: "auth", message: "Autenticação necessária para consultar o carrinho." }]);
      }
      const cart = await CartService.getCart(userId);
      return res.status(200).json(success(cart));
    } catch (e) {
      next(e);
    }
  }

  async addItem(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError([{ field: "auth", message: "Autenticação necessária para adicionar itens." }]);
      }
      const { productId, quantity } = req.body;
      const numProductId = Number(productId);
      const numQty = quantity ? Number(quantity) : 1;

      if (!numProductId || isNaN(numProductId)) {
        throw new ValidationError([{ field: "productId", message: "ID do produto inválido ou não informado." }]);
      }

      const cart = await CartService.addItem(userId, numProductId, numQty);
      return res.status(200).json(success(cart));
    } catch (e) {
      next(e);
    }
  }

  async updateQuantity(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError([{ field: "auth", message: "Autenticação necessária para atualizar itens." }]);
      }
      const numProductId = Number(req.params.productId);
      const { quantity } = req.body;
      const numQty = Number(quantity);

      if (!numProductId || isNaN(numProductId)) {
        throw new ValidationError([{ field: "productId", message: "ID do produto inválido." }]);
      }
      if (isNaN(numQty)) {
        throw new ValidationError([{ field: "quantity", message: "Quantidade inválida." }]);
      }

      const cart = await CartService.updateQuantity(userId, numProductId, numQty);
      return res.status(200).json(success(cart));
    } catch (e) {
      next(e);
    }
  }

  async removeItem(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError([{ field: "auth", message: "Autenticação necessária para remover itens." }]);
      }
      const numProductId = Number(req.params.productId);
      if (!numProductId || isNaN(numProductId)) {
        throw new ValidationError([{ field: "productId", message: "ID do produto inválido." }]);
      }

      const cart = await CartService.removeItem(userId, numProductId);
      return res.status(200).json(success(cart));
    } catch (e) {
      next(e);
    }
  }

  async clearCart(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError([{ field: "auth", message: "Autenticação necessária para limpar o carrinho." }]);
      }
      const result = await CartService.clearCart(userId);
      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }

  async optimizeCart(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { items, userLocation, vehicleSettings, preferences } = req.body;

      const result = await CartService.optimizeCart({
        userId,
        items,
        userLocation,
        vehicleSettings,
        preferences,
      });

      return res.status(200).json(success(result));
    } catch (e) {
      next(e);
    }
  }
}

export const cartController = new CartControllerClass();
