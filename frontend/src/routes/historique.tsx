import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/pages/History";

export const Route = createFileRoute("/historique")({
  head: () => ({
    meta: [
      { title: "Historique des triages — MediFlow AI" },
      {
        name: "description",
        content:
          "Historique des triages réalisés par l'infirmier(ère), filtrable et exportable en CSV.",
      },
      { property: "og:title", content: "Historique des triages — MediFlow AI" },
      {
        property: "og:description",
        content: "Recherche, filtres ESI et export CSV des triages réalisés.",
      },
    ],
  }),
  component: () => (
    <HistoryPage
      scope="mine"
      allow={["infirmier"]}
      title="Historique des triages"
      subtitle="Vos triages réalisés — recherche, filtres ESI et export"
    />
  ),
});
