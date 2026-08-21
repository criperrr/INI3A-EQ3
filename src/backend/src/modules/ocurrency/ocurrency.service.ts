import { OcurrencyRepository } from "@/shared/database/repositories/ocurrency.repository";
import { UserRepository } from "@/shared/database/repositories/user.repository";
import { ProductRepository } from "@/shared/database/repositories/product.repository";
import { MarketRepository } from "@/shared/database/repositories/market.repository";
import { NotFoundError, ForbiddenError, ValidationError } from "@/shared/errors/errors";

class OcurrencyServiceClass {
  async create(data: {
    userId: number;
    productId: number;
    marketId: number;
    value: number | string;
    icon?: string | undefined;
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

    const [created] = await OcurrencyRepository.create({
      userId: data.userId,
      productId: data.productId,
      marketId: data.marketId,
      value: numValue,
      icon: data.icon,
      createdAt: data.createdAt,
    });

    // Award +15 XP for contributing price
    const updatedUser = await UserRepository.incrementPoints(data.userId, 15);

    return {
      occurrence: created,
      pointsEarned: 15,
      currentPoints: updatedUser?.points ?? 0,
    };
  }

  async getByProduct(productId: number) {
    return OcurrencyRepository.findByProduct(productId);
  }

  async vote(userId: number, ocurrencyId: number, verdict: boolean) {
    const occurrence = await OcurrencyRepository.findById(ocurrencyId);
    if (!occurrence) {
      throw new NotFoundError("Ocorrência de preço não encontrada.");
    }

    const result = await OcurrencyRepository.vote(userId, ocurrencyId, verdict);

    // Award +5 XP for active curation/audit
    const updatedUser = await UserRepository.incrementPoints(userId, 5);

    return {
      ...result,
      pointsEarned: 5,
      currentPoints: updatedUser?.points ?? 0,
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
    return { deleted: true, id: ocurrencyId };
  }
}

export const ocurrencyService = new OcurrencyServiceClass();
