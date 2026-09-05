import { OcurrencyRepository } from "@/shared/database/repositories/ocurrency.repository";
import { UserRepository } from "@/shared/database/repositories/user.repository";
import { ProductRepository } from "@/shared/database/repositories/product.repository";
import { MarketRepository } from "@/shared/database/repositories/market.repository";
import { NotFoundError, ForbiddenError, ValidationError, TooManyRequestsError } from "@/shared/errors/errors";
import { invalidateCachePattern } from "@/shared/middlewares/cacheMiddleware";

class OcurrencyServiceClass {
  async create(data: {
    userId: number;
    productId: number;
    marketId: number;
    value: number | string;
    icon?: string | undefined;
    isPromotion?: boolean | undefined;
    createdAt?: string | Date | undefined;
  }) {
    const numValue = typeof data.value === "string" ? parseFloat(data.value.replace(/[^0-9.,]/g, "").replace(",", ".")) : data.value;
    if (isNaN(numValue) || numValue <= 0) {
      throw new ValidationError([{ field: "value", message: "O valor deve ser um número positivo." }]);
    }

    const product = await ProductRepository.getProductById(data.productId);
    if (!product) {
      throw new NotFoundError("Produto não encontrado.");
    }

    const market = await MarketRepository.getMarket(data.marketId);
    if (!market || market.length === 0) {
      throw new NotFoundError("Mercado não encontrado.");
    }

    // Cooldown check: prevent submitting 2 prices for the same product within 5 minutes (300 seconds)
    const COOLDOWN_MS = 5 * 60 * 1000;
    const recentOccurrence = await OcurrencyRepository.findRecentByUserAndProduct(
      data.userId,
      data.productId,
      COOLDOWN_MS,
    );

    if (recentOccurrence) {
      const recentTime = new Date(recentOccurrence.createdAt).getTime();
      const elapsedMs = Date.now() - recentTime;
      const remainingSeconds = Math.max(1, Math.ceil((COOLDOWN_MS - elapsedMs) / 1000));
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      const timeMsg =
        remainingSeconds > 60
          ? `${remainingMinutes} minuto${remainingMinutes > 1 ? "s" : ""}`
          : `${remainingSeconds} segundo${remainingSeconds > 1 ? "s" : ""}`;

      throw new TooManyRequestsError(
        `Você já enviou um preço para este produto recentemente. Aguarde ${timeMsg} antes de enviar novamente.`,
      );
    }

    const [created] = await OcurrencyRepository.create({
      userId: data.userId,
      productId: data.productId,
      marketId: data.marketId,
      value: numValue,
      icon: data.icon,
      isPromotion: Boolean(data.isPromotion),
      createdAt: data.createdAt,
    });

    // Award +15 XP for contributing price
    const updatedUser = await UserRepository.incrementPoints(data.userId, 15);

    await invalidateCachePattern("products");

    return {
      occurrence: created,
      pointsEarned: 15,
      currentPoints: updatedUser?.points ?? 0,
    };
  }

  async getByProduct(
    productId: number,
    currentUserId?: number,
    coords?: { lat: number; lng: number; radius?: number },
  ) {
    return OcurrencyRepository.findByProduct(productId, currentUserId, coords);
  }

  async vote(userId: number, ocurrencyId: number, verdict: boolean) {
    const occurrence = await OcurrencyRepository.findById(ocurrencyId);
    if (!occurrence) {
      throw new NotFoundError("Ocorrência de preço não encontrada.");
    }

    if (occurrence.userId === userId) {
      throw new ForbiddenError("Você não pode votar no seu próprio preço informado.");
    }

    const result = await OcurrencyRepository.vote(userId, ocurrencyId, verdict);

    let pointsEarned = 0;
    let currentPoints = 0;

    if (result.isNewVote) {
      // Award +5 XP only for new curation/audit
      const updatedUser = await UserRepository.incrementPoints(userId, 5);
      pointsEarned = 5;
      currentPoints = updatedUser?.points ?? 0;
    } else if (result.removed) {
      // Deduct 5 XP when vote is undone
      const updatedUser = await UserRepository.incrementPoints(userId, -5);
      pointsEarned = -5;
      currentPoints = updatedUser?.points ?? 0;
    } else {
      const user = await UserRepository.getUserById(userId);
      currentPoints = user?.points ?? 0;
    }

    return {
      ...result,
      pointsEarned,
      currentPoints,
    };
  }

  async update(
    userId: number,
    roleId: number,
    ocurrencyId: number,
    data: { value?: number | string | undefined; marketId?: number | undefined },
  ) {
    const occurrence = await OcurrencyRepository.findById(ocurrencyId);
    if (!occurrence) {
      throw new NotFoundError("Ocorrência não encontrada.");
    }

    const isAdmin = roleId === 5;
    if (!isAdmin && occurrence.userId !== userId) {
      throw new ForbiddenError("Você só pode editar suas próprias ocorrências de preço.");
    }

    let parsedValue: number | undefined = undefined;
    if (data.value !== undefined) {
      parsedValue = typeof data.value === "string" ? parseFloat(data.value.replace(/[^0-9.,]/g, "").replace(",", ".")) : data.value;
      if (isNaN(parsedValue) || parsedValue <= 0) {
        throw new ValidationError([{ field: "value", message: "Valor inválido." }]);
      }
    }

    const [updated] = await OcurrencyRepository.update(ocurrencyId, {
      value: parsedValue,
      marketId: data.marketId,
    });

    await invalidateCachePattern("products");

    return updated;
  }

  async delete(userId: number, roleId: number, ocurrencyId: number) {
    const occurrence = await OcurrencyRepository.findById(ocurrencyId);
    if (!occurrence) {
      throw new NotFoundError("Ocorrência não encontrada.");
    }

    const isAdmin = roleId === 5;
    if (!isAdmin && occurrence.userId !== userId) {
      throw new ForbiddenError("Você só pode excluir suas próprias ocorrências de preço.");
    }

    await OcurrencyRepository.delete(ocurrencyId);
    await invalidateCachePattern("products");
    return { deleted: true, id: ocurrencyId };
  }
}

export const ocurrencyService = new OcurrencyServiceClass();
