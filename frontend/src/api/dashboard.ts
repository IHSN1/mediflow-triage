import type { DashboardStats } from "@/types";
import { api } from "./client";

export function fetchDashboardStats(): Promise<DashboardStats> {
  return api.get<DashboardStats>("/api/dashboard/stats");
}
