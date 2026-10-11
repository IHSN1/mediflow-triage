import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/pages/Login";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediFlow AI — Connexion à votre espace clinique" },
      {
        name: "description",
        content:
          "MediFlow AI : plateforme d'aide au triage médical aux urgences, échelle ESI 1 à 5, règles de sécurité et explicabilité.",
      },
      { property: "og:title", content: "MediFlow AI — Triage médical assisté par IA" },
      {
        property: "og:description",
        content:
          "Connexion à l'espace clinique MediFlow AI : triage ESI, règles de sécurité, explicabilité.",
      },
    ],
  }),
  component: LoginPage,
});
