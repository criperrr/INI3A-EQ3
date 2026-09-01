import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3333";

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
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

function getDefaultErrorDetails(status: number): { code: string; message: string } {
  switch (status) {
    case 400:
      return { code: "BAD_REQUEST", message: "Requisição inválida." };
    case 401:
      return { code: "UNAUTHORIZED", message: "Você precisa estar conectado para realizar esta ação." };
    case 403:
      return { code: "FORBIDDEN", message: "Acesso negado. Permissões insuficientes." };
    case 404:
      return { code: "NOT_FOUND", message: "Recurso não encontrado." };
    case 408:
      return { code: "TIMEOUT", message: "A requisição demorou muito para responder." };
    case 409:
      return { code: "CONFLICT", message: "O recurso já existe ou conflita com dados atuais." };
    case 422:
      return { code: "VALIDATION_ERROR", message: "Dados fornecidos são inválidos." };
    case 502:
    case 503:
    case 504:
      return { code: "SERVICE_UNAVAILABLE", message: "Servidor ou túnel temporariamente indisponível." };
    default:
      return status >= 500
        ? { code: "SERVER_ERROR", message: "Erro interno no servidor." }
        : { code: "UNKNOWN_ERROR", message: "Ocorreu um erro na requisição." };
  }
}

/**
 * Handles response parsing and error mapping.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  let body: any = null;
  try {
    const text = await response.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    body = null;
  }

  if (!response.ok) {
    const defaults = getDefaultErrorDetails(response.status);
    const resolvedCode = body?.code || body?.error || defaults.code;
    const resolvedMessage =
      body?.message ||
      (typeof body?.error === "string" ? body.error : undefined) ||
      body?.msg ||
      defaults.message;

    throw new ApiError(
      response.status,
      resolvedCode,
      resolvedMessage,
      body?.errors,
    );
  }

  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }

  return body as T;
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
      headers: {
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true",
      },
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

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
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
