import AsyncStorage from "@react-native-async-storage/async-storage";

// Lê a URL base da variável de ambiente Expo
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const STORAGE_KEYS = {
  JWT: "@presco:jwt",
  REFRESH_TOKEN: "@presco:refreshToken",
  USER: "@presco:user",
} as const;

// Tipos base das respostas da API
export interface ApiSuccess<T = unknown> {
  success: true;
  status: number;
  data?: T;
}

export interface ApiError {
  success: false;
  status: number;
  message: string;
  textCode?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// Erro tipado para uso no frontend
export class ApiRequestError extends Error {
  constructor(
    public readonly textCode: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/**
 * Recupera o JWT armazenado no AsyncStorage
 */
export async function getStoredJwt(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.JWT);
}

/**
 * Persiste tokens e dados do usuário no AsyncStorage
 */
export async function storeSession(data: {
  jwt: string;
  refreshToken: string;
  user: object;
}): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.JWT, data.jwt],
    [STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken],
    [STORAGE_KEYS.USER, JSON.stringify(data.user)],
  ]);
}

/**
 * Limpa todos os tokens do AsyncStorage (logout)
 */
export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.JWT,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
  ]);
}

/**
 * Tenta renovar o JWT usando o refreshToken armazenado.
 * Retorna o novo JWT ou null se falhar.
 */
async function tryRefreshJwt(): Promise<string | null> {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return null;

    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await clearSession();
      return null;
    }

    const body = await res.json();
    const newJwt: string = body.data?.jwt ?? body.jwt;
    const newRefreshToken: string =
      body.data?.refreshToken ?? body.refreshToken;
    const user = body.data?.userReturned ?? body.userReturned;

    if (newJwt) {
      await storeSession({ jwt: newJwt, refreshToken: newRefreshToken, user });
    }

    return newJwt ?? null;
  } catch {
    return null;
  }
}

/**
 * Função principal de requisição HTTP.
 * Injeta automaticamente o JWT no header Authorization.
 * Em caso de 401, tenta refresh antes de falhar.
 */
export async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
  _retry = true,
): Promise<T> {
  const jwt = await getStoredJwt();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Se 401 e ainda podemos tentar refresh
  if (response.status === 401 && _retry) {
    const newJwt = await tryRefreshJwt();
    if (newJwt) {
      // Retry com novo token
      return request<T>(path, options, false);
    }
    throw new ApiRequestError("UNAUTHORIZED", "Sessão expirada. Faça login novamente.", 401);
  }

  const body: ApiResponse<T> = await response.json();

  if (!response.ok || !body.success) {
    const err = body as ApiError;
    throw new ApiRequestError(
      err.textCode ?? "UNKNOWN_ERROR",
      err.message ?? "Ocorreu um erro inesperado.",
      response.status,
    );
  }

  return (body as ApiSuccess<T>).data as T;
}
