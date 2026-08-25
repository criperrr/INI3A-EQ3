import { eq, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "../database";
import * as schema from "../schema";

const CustomizationItem = schema.customizationItem;
const UserCustomization = schema.userCustomization;
const User = schema.user;

class CustomizationRepositoryClass {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async getAllItems() {
    return this.db
      .select()
      .from(CustomizationItem)
      .orderBy(CustomizationItem.category, CustomizationItem.minLevel, CustomizationItem.price);
  }

  async getItemById(id: number) {
    const results = await this.db
      .select()
      .from(CustomizationItem)
      .where(eq(CustomizationItem.id, id));
    return results[0] || null;
  }

  async getUserInventory(userId: number) {
    const results = await this.db
      .select({
        itemId: UserCustomization.itemId,
        purchasedAt: UserCustomization.purchasedAt,
      })
      .from(UserCustomization)
      .where(eq(UserCustomization.userId, userId));
    return results;
  }

  async isItemOwnedByUser(userId: number, itemId: number): Promise<boolean> {
    const item = await this.getItemById(itemId);
    if (item?.isDefault || item?.price === 0) {
      return true;
    }
    const results = await this.db
      .select({ itemId: UserCustomization.itemId })
      .from(UserCustomization)
      .where(
        and(
          eq(UserCustomization.userId, userId),
          eq(UserCustomization.itemId, itemId)
        )
      );
    return results.length > 0;
  }

  async addCustomizationToUser(userId: number, itemId: number) {
    return this.db
      .insert(UserCustomization)
      .values({
        userId,
        itemId,
      })
      .onConflictDoNothing()
      .returning();
  }

  async updateUserEquipped(
    userId: number,
    fields: {
      equippedBannerId?: number | null;
      equippedAvatarFrameId?: number | null;
      equippedLevelFrameId?: number | null;
    }
  ) {
    return this.db
      .update(User)
      .set(fields)
      .where(eq(User.id, userId))
      .returning({
        id: User.id,
        equippedBannerId: User.equippedBannerId,
        equippedAvatarFrameId: User.equippedAvatarFrameId,
        equippedLevelFrameId: User.equippedLevelFrameId,
      });
  }

  async getUserEquippedCustomizations(userId: number) {
    const userRes = await this.db
      .select({
        equippedBannerId: User.equippedBannerId,
        equippedAvatarFrameId: User.equippedAvatarFrameId,
        equippedLevelFrameId: User.equippedLevelFrameId,
      })
      .from(User)
      .where(eq(User.id, userId));

    const u = userRes[0];
    if (!u) return null;

    let banner = null;
    let avatarFrame = null;
    let levelFrame = null;

    if (u.equippedBannerId) {
      banner = await this.getItemById(u.equippedBannerId);
    } else {
      const defaults = await this.db
        .select()
        .from(CustomizationItem)
        .where(and(eq(CustomizationItem.category, "banner"), eq(CustomizationItem.isDefault, true)));
      banner = defaults[0] || null;
    }

    if (u.equippedAvatarFrameId) {
      avatarFrame = await this.getItemById(u.equippedAvatarFrameId);
    } else {
      const defaults = await this.db
        .select()
        .from(CustomizationItem)
        .where(and(eq(CustomizationItem.category, "avatar_frame"), eq(CustomizationItem.isDefault, true)));
      avatarFrame = defaults[0] || null;
    }

    if (u.equippedLevelFrameId) {
      levelFrame = await this.getItemById(u.equippedLevelFrameId);
    } else {
      const defaults = await this.db
        .select()
        .from(CustomizationItem)
        .where(and(eq(CustomizationItem.category, "level_frame"), eq(CustomizationItem.isDefault, true)));
      levelFrame = defaults[0] || null;
    }

    return {
      banner,
      avatarFrame,
      levelFrame,
    };
  }
}

export const CustomizationRepository = new CustomizationRepositoryClass(db);
