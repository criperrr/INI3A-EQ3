import { apiRequest } from "./api";

export interface CustomizationItemConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  borderColor?: string;
  borderWidth?: number;
  glowColor?: string;
  topBadge?: string;
  bg?: string;
  textColor?: string;
  icon?: string;
  badgeColor?: string;
}

export interface CustomizationItem {
  id: number;
  name: string;
  category: "banner" | "avatar_frame" | "level_frame" | "title";
  description: string | null;
  price: number;
  minLevel: number;
  previewValue: string;
  config: CustomizationItemConfig;
  isDefault: boolean;
  isOwned: boolean;
  isEquipped: boolean;
  canAfford: boolean;
  meetsLevel: boolean;
}

export interface EquippedCustomizations {
  banner: CustomizationItem | null;
  avatarFrame: CustomizationItem | null;
  levelFrame: CustomizationItem | null;
  title?: CustomizationItem | null;
}

export interface ShopCatalogData {
  userPoints: number;
  userLevel: number;
  isAdmin: boolean;
  equipped: EquippedCustomizations;
  items: CustomizationItem[];
}

export interface CustomizationActionResult {
  message: string;
  catalog: ShopCatalogData;
}

/**
 * Fetches all available customization items with ownership and equipped status.
 */
export async function fetchCustomizationCatalog(): Promise<ShopCatalogData> {
  return apiRequest<ShopCatalogData>("/customizations/shop", {
    method: "GET",
  });
}

/**
 * Buys a customization item using user XP / Points.
 */
export async function buyCustomizationItem(
  itemId: number,
): Promise<CustomizationActionResult> {
  return apiRequest<CustomizationActionResult>(`/customizations/buy/${itemId}`, {
    method: "POST",
  });
}

/**
 * Equips an owned customization item.
 */
export async function equipCustomizationItem(
  itemId: number,
): Promise<CustomizationActionResult> {
  return apiRequest<CustomizationActionResult>(`/customizations/equip/${itemId}`, {
    method: "POST",
  });
}

/**
 * Unequips a customization category and returns to default.
 */
export async function unequipCustomizationCategory(
  category: "banner" | "avatar_frame" | "level_frame" | "title",
): Promise<CustomizationActionResult> {
  return apiRequest<CustomizationActionResult>(`/customizations/unequip/${category}`, {
    method: "POST",
  });
}
