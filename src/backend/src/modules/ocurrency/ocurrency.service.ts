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
    confirmOutlier?: boolean | undefined;
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

    // --- Dynamic Adaptive Standard Deviation & Outlier Analysis ---
    const stats = await OcurrencyRepository.getAdaptivePriceStats(data.productId, numValue);

    let isExtremeOutlier = false;
    let isModerateOutlier = false;
    let outlierRatio = 1;
    let zScore = 0;

    if (stats.count > 0 && stats.avgPrice && stats.avgPrice > 0) {
      const mu = stats.avgPrice;
      const sigma = stats.stddevPrice;
      const delta = Math.abs(numValue - mu);
      outlierRatio = numValue >= mu ? numValue / mu : mu / numValue;
      zScore = sigma > 0 ? delta / sigma : 0;

      if (!stats.hasQuorumForCandidate) {
        // No multi-user quorum supporting this new level: strictly evaluate deviation
        if (
          ((outlierRatio >= 5.0 || numValue <= 0.15 * mu) || (stats.count >= 3 && zScore >= 4.0)) &&
          delta >= 3.0
        ) {
          isExtremeOutlier = true;
        } else if (
          ((outlierRatio >= 2.2 || numValue <= 0.45 * mu) || (stats.count >= 3 && zScore >= 2.2)) &&
          delta >= 1.5
        ) {
          isModerateOutlier = true;
        }
      } else {
        // Multi-user consensus / inflation cluster detected (2+ distinct authenticated users)!
        // Do not block extreme outlier. Only prompt for confirmation if still significantly higher and unconfirmed:
        if (outlierRatio >= 2.5 && delta >= 2.0 && !data.confirmOutlier) {
          isModerateOutlier = true;
        }
      }
    }

    // 1. Extreme Outlier: Retain for admin review, suspend, 0 XP until approved
    if (isExtremeOutlier) {
      const [created] = await OcurrencyRepository.create({
        userId: data.userId,
        productId: data.productId,
        marketId: data.marketId,
        value: numValue,
        icon: data.icon,
        isPromotion: Boolean(data.isPromotion),
        isSuspended: true,
        isResolved: false,
        trustFlag: false,
        createdAt: data.createdAt,
      });

      const user = await UserRepository.getUserById(data.userId);
      return {
        occurrence: created,
        pointsEarned: 0,
        currentPoints: user?.points ?? 0,
        isSuspended: true,
        pendingApproval: true,
        requiresConfirmation: false,
        stats: {
          avgPrice: stats.avgPrice,
          currentPrice: numValue,
          ratio: Number(outlierRatio.toFixed(2)),
          zScore: Number(zScore.toFixed(2)),
        },
        message: "O valor informado difere expressivamente da média histórica do produto e foi retido para análise da moderação antes de ser exibido.",
      };
    }

    // 2. Moderate Outlier: Require explicit user confirmation before recording
    if (isModerateOutlier && !data.confirmOutlier) {
      return {
        requiresConfirmation: true,
        pendingApproval: false,
        stats: {
          avgPrice: stats.avgPrice,
          currentPrice: numValue,
          ratio: Number(outlierRatio.toFixed(2)),
          zScore: Number(zScore.toFixed(2)),
          trendDetected: stats.hasQuorumForCandidate,
        },
        message: "O valor informado difere da média recente deste produto. Confirme se o preço digitado está correto.",
      };
    }

    // 3. Standard / Confirmed Flow: Save normally, award +15 XP
    const [created] = await OcurrencyRepository.create({
      userId: data.userId,
      productId: data.productId,
      marketId: data.marketId,
      value: numValue,
      icon: data.icon,
      isPromotion: Boolean(data.isPromotion),
      isSuspended: false,
      isResolved: true,
      trustFlag: true,
      createdAt: data.createdAt,
    });

    // Award +15 XP for contributing price
    const updatedUser = await UserRepository.incrementPoints(data.userId, 15);

    await invalidateCachePattern("products");

    return {
      occurrence: created,
      pointsEarned: 15,
      currentPoints: updatedUser?.points ?? 0,
      isSuspended: false,
      pendingApproval: false,
      requiresConfirmation: false,
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

  async getPendingAdminOccurrences() {
    const pending = await OcurrencyRepository.getPendingOccurrences();
    const enriched = await Promise.all(
      pending.map(async (item) => {
        const stats = await OcurrencyRepository.getAdaptivePriceStats(item.productId, Number(item.value));
        const numVal = Number(item.value);
        const avg = stats.avgPrice;
        let diffPercent = 0;
        if (avg && avg > 0) {
          diffPercent = Math.round(((numVal - avg) / avg) * 100);
        }

        return {
          ...item,
          baselineAvgPrice: avg,
          stddevPrice: stats.stddevPrice,
          diffPercent,
          hasTrendQuorum: stats.hasQuorumForCandidate,
          quorumUsersCount: stats.quorumCount,
        };
      })
    );

    return enriched;
  }

  async approve(adminUserId: number, ocurrencyId: number) {
    const occurrence = await OcurrencyRepository.findById(ocurrencyId);
    if (!occurrence) {
      throw new NotFoundError("Ocorrência não encontrada.");
    }

    const approved = await OcurrencyRepository.approveOccurrence(ocurrencyId);
    if (!approved) {
      throw new NotFoundError("Erro ao aprovar ocorrência.");
    }

    // Award +15 XP to the original author
    await UserRepository.incrementPoints(occurrence.userId, 15);
    await invalidateCachePattern("products");

    return {
      approved: true,
      occurrence: approved,
    };
  }

  async reject(adminUserId: number, ocurrencyId: number) {
    const occurrence = await OcurrencyRepository.findById(ocurrencyId);
    if (!occurrence) {
      throw new NotFoundError("Ocorrência não encontrada.");
    }

    const rejected = await OcurrencyRepository.rejectOccurrence(ocurrencyId);
    if (!rejected) {
      throw new NotFoundError("Erro ao rejeitar ocorrência.");
    }

    await invalidateCachePattern("products");

    return {
      rejected: true,
      occurrence: rejected,
    };
  }
}

export const ocurrencyService = new OcurrencyServiceClass();
