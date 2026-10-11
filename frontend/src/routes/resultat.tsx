import { createFileRoute } from "@tanstack/react-router";
import { ResultPage } from "@/pages/Result";

export const Route = createFileRoute("/resultat")({
  head: () => ({
    meta: [
      { title: "Résultat de triage — MediFlow AI" },
      {
        name: "description",
        content: "Niveau ESI final, règles de sécurité déclenchées et résumé clinique structuré.",
      },
      { property: "og:title", content: "Résultat de triage — MediFlow AI" },
      {
        property: "og:description",
        content: "Comparaison prédiction brute / niveau final et explicabilité de la décision.",
      },
    ],
  }),
  component: ResultPage,
});
