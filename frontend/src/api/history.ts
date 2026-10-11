import type { HistoryEntry, HistoryFilters } from "@/types";
import { api } from "./client";

/** GET/DELETE /api/history (infirmier, scope "mine") ou /api/patients (médecin, scope "service"). */
function basePath(scope: HistoryFilters["scope"]): string {
  return scope === "service" ? "/api/patients" : "/api/history";
}

export function fetchHistory(filters: HistoryFilters = {}): Promise<HistoryEntry[]> {
  return api.get<HistoryEntry[]>(basePath(filters.scope));
}

export function deleteHistoryEntry(scope: HistoryFilters["scope"], id: number): Promise<void> {
  return api.del<void>(`${basePath(scope)}/${id}`);
}

export function exportToCSV(rows: HistoryEntry[], filename = "mediflow-triages.csv"): void {
  const headers = ["Date", "Patient", "Motif", "ESI", "Résumé"];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""').replace(/\n/g, " ")}"`;
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      [r.date, r.patient, r.chief_complaint, `ESI ${r.niveau_infirmiere}`, r.resume_clinique]
        .map(escape)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
