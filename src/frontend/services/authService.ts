import { request, storeSession, clearSession } from "./api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roleId: number;
}

export interface AuthResponse {
  jwt: string;
  refreshToken: string;
  userReturned: AuthUser;
}

/**
 * Faz login com email e senha.
 * Armazena JWT, refreshToken e dados do usuário no AsyncStorage.
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  await storeSession({
    jwt: data.jwt,
    refreshToken: data.refreshToken,
    user: data.userReturned,
  });

  return data;
}

/**
 * Registra novo usuário.
 * Armazena JWT, refreshToken e dados do usuário no AsyncStorage.
 */
export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  await storeSession({
    jwt: data.jwt,
    refreshToken: data.refreshToken,
    user: data.userReturned,
  });

  return data;
}

/**
 * Remove todos os tokens do AsyncStorage (logout local).
 */
export async function logout(): Promise<void> {
  await clearSession();
}
