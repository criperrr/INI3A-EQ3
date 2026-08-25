import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, STORAGE_KEYS } from "./api";
import type { EquippedCustomizations } from "./customizationService";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleName?: string;
  authority?: number;
  isAdmin?: boolean;
  points?: number;
  level?: number;
  currentXp?: number;
  maxXp?: number;
  levelTitle?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BadgeItem {
  id: number;
  name: string;
  icon: string | null;
  description?: string | null;
  minPoints: number;
  isUnlocked: boolean;
  awardedAt?: string | null;
}

export interface UserStats {
  rank: number;
  reportedPrices: number;
  points: number;
  badgesCount: number;
}

export interface UserProfileData extends AuthUser {
  stats: UserStats;
  badges: BadgeItem[];
  equippedCustomizations?: EquippedCustomizations | null;
  contributionsGrid: number[][];
  recentContributions: Array<{
    id: number;
    productId: number;
    productName: string;
    productIcon?: string | null;
    marketId: number;
    marketName: string;
    value: string;
    createdAt: string;
  }>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}


/**
 * Registers a new user and stores the returned tokens.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthTokens> {
  const data = await apiRequest<AuthTokens>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, data.accessToken],
    [STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken],
  ]);

  return data;
}

/**
 * Logs in a user and stores the returned tokens.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const data = await apiRequest<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, data.accessToken],
    [STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken],
  ]);

  return data;
}

/**
 * Logs out the user: calls the API (to blacklist) and clears local storage.
 */
export async function logoutUser(): Promise<void> {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    await apiRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Even if the API call fails, we still clear local tokens
  } finally {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]);
  }
}

/**
 * Checks if there are stored tokens (basic auth state check).
 */
export async function getStoredTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const [accessToken, refreshToken] = await AsyncStorage.multiGet([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
  ]);

  return {
    accessToken: accessToken[1],
    refreshToken: refreshToken[1],
  };
}

/**
 * Updates the user's password using the authenticated API.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/**
 * Deletes the authenticated user's account and clears stored tokens.
 */
export async function deleteAccount(): Promise<void> {
  try {
    await apiRequest("/auth/account", {
      method: "DELETE",
    });
  } finally {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]);
  }
}

/**
 * Fetches the full profile of the authenticated user (points, level, badges, stats).
 */
export async function fetchUserProfile(): Promise<UserProfileData | null> {
  try {
    const tokens = await getStoredTokens();
    if (!tokens.accessToken) {
      return null;
    }
    return await apiRequest<UserProfileData>("/auth/me", {
      method: "GET",
    });
  } catch (error: any) {
    if (error?.status === 401) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
      return null;
    }
    console.error("[Auth] Error fetching user profile:", error);
    return null;
  }
}



