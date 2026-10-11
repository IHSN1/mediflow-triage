import { createFileRoute } from "@tanstack/react-router";
import { NewPatientPage } from "@/pages/NewPatient";

export const Route = createFileRoute("/nouveau-patient")({
  head: () => ({
    meta: [
      { title: "Nouveau patient — MediFlow AI" },
      {
        name: "description",
        content: "Saisie de l'accueil : identité, motif de consultation et signes vitaux.",
      },
      { property: "og:title", content: "Nouveau patient — MediFlow AI" },
      {
        property: "og:description",
        content: "Formulaire d'accueil des urgences avant lancement de l'agent IA.",
      },
    ],
  }),
  component: NewPatientPage,
});
