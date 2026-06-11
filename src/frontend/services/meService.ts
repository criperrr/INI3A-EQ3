import { request } from "./api";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  roleId: number;
  points?: number;
  dangerFlag?: boolean;
  birthdate?: string | null;
  createdAt?: string;
}

export interface UpdateMePayload {
  name?: string;
  email?: string;
  password?: string;
  birthdate?: string;
}

/**
 * Retorna os dados do usuário autenticado.
 * Requer JWT válido no AsyncStorage.
 */
export async function getMe(): Promise<UserProfile> {
  return request<UserProfile>("/api/v1/me");
}

/**
 * Atualiza os dados do usuário autenticado.
 */
export async function updateMe(payload: UpdateMePayload): Promise<UserProfile> {
  return request<UserProfile>("/api/v1/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Deleta a conta do usuário autenticado.
 */
export async function deleteMe(): Promise<void> {
  await request("/api/v1/me", { method: "DELETE" });
}
