import type { AuthUser } from "@/types";
import { api } from "./client";

interface LoginResponse {
  token: string;
  role: AuthUser["role"];
  userId: number;
  fullName: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<LoginResponse>("/api/auth/login", { email, password });
  return {
    token: res.token,
    role: res.role,
    userId: String(res.userId),
    fullName: res.fullName,
  };
}

/** Journalise la déconnexion côté backend (audit_logs). Doit être appelé avant d'effacer le token local. */
export function logout(): Promise<void> {
  return api.post<void>("/api/auth/logout");
}
