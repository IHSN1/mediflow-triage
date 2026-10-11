import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/pages/Admin";

export const Route = createFileRoute("/administration")({
  head: () => ({
    meta: [
      { title: "Administration — MediFlow AI" },
      {
        name: "description",
        content: "Gestion des comptes utilisateurs MediFlow : création, rôles et activation.",
      },
      { property: "og:title", content: "Administration — MediFlow AI" },
      {
        property: "og:description",
        content: "Gestion des comptes du service, sans accès aux données patients.",
      },
    ],
  }),
  component: AdminPage,
});
