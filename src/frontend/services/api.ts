import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "@presco:accessToken",
  REFRESH_TOKEN: "@presco:refreshToken",
} as const;

interface ApiResponse<T = any> {
  success: boolean;
  code: number | string;
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

class ApiError extends Error {
  status: number;
  code: string;
  errors?: Array<{ field: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    errors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

/**
 * Handles response parsing and error mapping.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.code || "UNKNOWN",
      body?.message || "Erro inesperado.",
      body?.errors,
    );
  }

  return body?.data as T;
}

/**
 * Tries to refresh the access token using the stored refresh token.
 * Returns true if the refresh was successful.
 */
async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (!refreshToken) return false;

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed — clear stored tokens
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
      return false;
    }

    const body = await response.json();
    const data = body?.data;

    if (data?.accessToken && data?.refreshToken) {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, data.accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken],
      ]);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Main API request function with automatic token injection and refresh retry.
 */
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // Define um timeout de 15 segundos para a requisição
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(id);

    // If 401 and we haven't retried yet, try refreshing the token
    if (response.status === 401 && retry) {
      const refreshed = await tryRefreshToken();

      if (refreshed) {
        return apiRequest<T>(endpoint, options, false);
      }
    }

    return handleResponse<T>(response);
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new ApiError(408, "TIMEOUT", "A requisição demorou muito para responder.");
    }
    throw error;
  }
}

export { apiRequest, ApiError, STORAGE_KEYS, BASE_URL };
export type { ApiResponse };
