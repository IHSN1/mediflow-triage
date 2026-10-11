import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/pages/History";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Liste des patients — MediFlow AI" },
      {
        name: "description",
        content:
          "Tous les triages du service des urgences, filtrables par niveau ESI et exportables.",
      },
      { property: "og:title", content: "Liste des patients — MediFlow AI" },
      {
        property: "og:description",
        content: "Vue médecin : ensemble des triages du service avec détail clinique.",
      },
    ],
  }),
  component: () => (
    <HistoryPage
      scope="service"
      allow={["medecin"]}
      title="Liste des patients"
      subtitle="Tous les triages du service des urgences"
    />
  ),
});
