import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/pages/Dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — MediFlow AI" },
      {
        name: "description",
        content: "Activité de triage du service des urgences : volumes, délais et répartition ESI.",
      },
      { property: "og:title", content: "Tableau de bord — MediFlow AI" },
      {
        property: "og:description",
        content: "Volumes de triage, temps moyen, patients critiques et répartition ESI.",
      },
    ],
  }),
  component: DashboardPage,
});
