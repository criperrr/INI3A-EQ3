import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, STORAGE_KEYS } from "./api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roleId: number;
  createdAt?: string;
  updatedAt?: string;
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
