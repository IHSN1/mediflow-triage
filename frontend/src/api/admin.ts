import type { AppUser, NewUserPayload, Role } from "@/types";
import { api } from "./client";

interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
}

const toAppUser = (u: UserResponse): AppUser => ({
  id: String(u.id),
  fullName: u.fullName,
  email: u.email,
  role: u.role,
  active: u.active,
});

export async function fetchUsers(): Promise<AppUser[]> {
  const res = await api.get<UserResponse[]>("/api/admin/users");
  return res.map(toAppUser);
}

export async function createUser(payload: NewUserPayload): Promise<AppUser> {
  const res = await api.post<UserResponse>("/api/admin/users", payload);
  return toAppUser(res);
}

export async function updateUserRole(userId: string, role: Role): Promise<{ success: true }> {
  await api.put<void>(`/api/admin/users/${userId}/role`, { role });
  return { success: true };
}

export async function toggleUserStatus(
  userId: string,
  active: boolean,
): Promise<{ success: true }> {
  await api.put<void>(`/api/admin/users/${userId}/status`, { active });
  return { success: true };
}

export async function deleteUser(userId: string): Promise<{ success: true }> {
  await api.del<void>(`/api/admin/users/${userId}`);
  return { success: true };
}
