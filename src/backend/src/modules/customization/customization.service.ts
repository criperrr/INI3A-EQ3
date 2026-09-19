import { CustomizationRepository } from "@/shared/database/repositories/customization.repository";
import { UserRepository } from "@/shared/database/repositories/user.repository";
import { NotFoundError, ValidationError, UnauthorizedError } from "@/shared/errors/errors";

class CustomizationServiceClass {
  private calculateUserLevel(points: number, isSuperAdmin: boolean): number {
    if (isSuperAdmin) return 99;
    if (points >= 1000) return 5 + Math.floor((points - 1000) / 500);
    if (points >= 500) return 4;
    if (points >= 250) return 3;
    if (points >= 100) return 2;
    return 1;
  }

  async getShopCatalog(userId: number | string) {
    const user = await UserRepository.getUserWithRole(userId);
    if (!user) {
      throw new UnauthorizedError("Usuário não encontrado.");
    }

    const points = user.points || 0;
    const isSuperAdmin = user.roleId === 5 || (user.authority !== null && user.authority >= 10);
    const level = this.calculateUserLevel(points, isSuperAdmin);

    const allItems = await CustomizationRepository.getAllItems();
    const inventory = await CustomizationRepository.getUserInventory(Number(userId));
    const ownedItemIds = new Set(inventory.map((i) => i.itemId));

    const equipped = await CustomizationRepository.getUserEquippedCustomizations(Number(userId));

    const itemsWithStatus = allItems.map((item) => {
      const isDefault = item.isDefault || (item.price === 0 && item.minLevel === 1);
      // Titles are unlocked automatically when level/points thresholds are met or owned in inventory
      const isTitleUnlocked =
        item.category === "title" &&
        (isDefault || isSuperAdmin || (level >= item.minLevel && points >= item.price));
      const isOwned = isDefault || isTitleUnlocked || ownedItemIds.has(item.id);
      
      let isEquipped = false;
      if (item.category === "banner") {
        isEquipped = equipped?.banner?.id === item.id;
      } else if (item.category === "avatar_frame") {
        isEquipped = equipped?.avatarFrame?.id === item.id;
      } else if (item.category === "level_frame") {
        isEquipped = equipped?.levelFrame?.id === item.id;
      } else if (item.category === "title") {
        isEquipped = equipped?.title?.id === item.id;
      }

      let parsedConfig = {};
      try {
        if (item.config) {
          parsedConfig = typeof item.config === "string" ? JSON.parse(item.config) : item.config;
        }
      } catch {
        parsedConfig = {};
      }

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description,
        price: item.price,
        minLevel: item.minLevel,
        previewValue: item.previewValue,
        config: parsedConfig,
        isDefault: item.isDefault,
        isOwned,
        isEquipped,
        canAfford: points >= item.price,
        meetsLevel: isSuperAdmin || level >= item.minLevel,
      };
    });

    return {
      userPoints: points,
      userLevel: level,
      isAdmin: isSuperAdmin,
      equipped,
      items: itemsWithStatus,
    };
  }

  async buyItem(userId: number | string, itemId: number) {
    const user = await UserRepository.getUserWithRole(userId);
    if (!user) {
      throw new UnauthorizedError("Usuário não encontrado.");
    }

    const item = await CustomizationRepository.getItemById(itemId);
    if (!item) {
      throw new NotFoundError("Item de personalização não encontrado.");
    }

    const points = user.points || 0;
    const isSuperAdmin = user.roleId === 5 || (user.authority !== null && user.authority >= 10);
    const level = this.calculateUserLevel(points, isSuperAdmin);

    if (!isSuperAdmin && level < item.minLevel) {
      throw new ValidationError([
        {
          field: "minLevel",
          message: `Nível ${item.minLevel} necessário para desbloquear este item. Seu nível atual é ${level}.`,
        },
      ]);
    }

    const isDefault = item.isDefault || (item.price === 0 && item.minLevel === 1);
    const isTitleUnlocked =
      item.category === "title" &&
      (isDefault || isSuperAdmin || (level >= item.minLevel && points >= item.price));
    const isOwned = isDefault || isTitleUnlocked || (await CustomizationRepository.isItemOwnedByUser(Number(userId), itemId));
    if (isOwned && !isDefault) {
      throw new ValidationError([
        {
          field: "itemId",
          message: "Você já possui este item no seu inventário.",
        },
      ]);
    }

    if (item.price > 0 && points < item.price) {
      throw new ValidationError([
        {
          field: "points",
          message: `Pontos insuficientes. Este item exige ${item.price} XP e você possui ${points} XP acumulados.`,
        },
      ]);
    }

    // Add to inventory (XP points are not spent/deducted; XP serves as milestone threshold)
    await CustomizationRepository.addCustomizationToUser(Number(userId), itemId);

    // Auto-equip the newly purchased item
    if (item.category === "banner") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedBannerId: item.id });
    } else if (item.category === "avatar_frame") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedAvatarFrameId: item.id });
    } else if (item.category === "level_frame") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedLevelFrameId: item.id });
    } else if (item.category === "title") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedTitleId: item.id });
    }

    const updatedCatalog = await this.getShopCatalog(userId);
    return {
      message: `Item "${item.name}" adquirido e equipado com sucesso!`,
      item,
      catalog: updatedCatalog,
    };
  }

  async equipItem(userId: number | string, itemId: number) {
    const user = await UserRepository.getUserWithRole(userId);
    if (!user) {
      throw new UnauthorizedError("Usuário não encontrado.");
    }

    const item = await CustomizationRepository.getItemById(itemId);
    if (!item) {
      throw new NotFoundError("Item de personalização não encontrado.");
    }

    const points = user.points || 0;
    const isSuperAdmin = user.roleId === 5 || (user.authority !== null && user.authority >= 10);
    const level = this.calculateUserLevel(points, isSuperAdmin);

    const isDefault = item.isDefault || (item.price === 0 && item.minLevel === 1);
    const isTitleUnlocked =
      item.category === "title" &&
      (isDefault || isSuperAdmin || (level >= item.minLevel && points >= item.price));
    const isOwned = isDefault || isTitleUnlocked || (await CustomizationRepository.isItemOwnedByUser(Number(userId), itemId));

    if (!isOwned) {
      throw new ValidationError([
        {
          field: "itemId",
          message: "Você ainda não desbloqueou este item. Alcance os requisitos necessários para poder equipar.",
        },
      ]);
    }

    if (item.category === "banner") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedBannerId: item.id });
    } else if (item.category === "avatar_frame") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedAvatarFrameId: item.id });
    } else if (item.category === "level_frame") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedLevelFrameId: item.id });
    } else if (item.category === "title") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedTitleId: item.id });
    } else {
      throw new ValidationError([
        {
          field: "category",
          message: "Categoria de item inválida.",
        },
      ]);
    }

    const updatedCatalog = await this.getShopCatalog(userId);
    return {
      message: `Item "${item.name}" equipado com sucesso!`,
      item,
      catalog: updatedCatalog,
    };
  }

  async unequipItem(userId: number | string, category: string) {
    const user = await UserRepository.getUserWithRole(userId);
    if (!user) {
      throw new UnauthorizedError("Usuário não encontrado.");
    }

    if (category === "banner") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedBannerId: null });
    } else if (category === "avatar_frame") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedAvatarFrameId: null });
    } else if (category === "level_frame") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedLevelFrameId: null });
    } else if (category === "title") {
      await CustomizationRepository.updateUserEquipped(Number(userId), { equippedTitleId: null });
    } else {
      throw new ValidationError([
        {
          field: "category",
          message: "Categoria inválida. Use 'banner', 'avatar_frame', 'level_frame' ou 'title'.",
        },
      ]);
    }

    const updatedCatalog = await this.getShopCatalog(userId);
    return {
      message: `Personalização de ${category} restaurada para o padrão!`,
      catalog: updatedCatalog,
    };
  }
}

export const customizationService = new CustomizationServiceClass();
