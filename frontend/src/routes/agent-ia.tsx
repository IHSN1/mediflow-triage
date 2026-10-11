import { createFileRoute } from "@tanstack/react-router";
import { AgentIAPage } from "@/pages/AgentIA";

export const Route = createFileRoute("/agent-ia")({
  head: () => ({
    meta: [
      { title: "Agent IA — Interrogatoire structuré | MediFlow AI" },
      {
        name: "description",
        content: "Interrogatoire conversationnel guidé en 5 étapes pour affiner le triage.",
      },
      { property: "og:title", content: "Agent IA — Interrogatoire structuré" },
      {
        property: "og:description",
        content: "Dialogue guidé avec le patient conduit par l'agent conversationnel MediFlow.",
      },
    ],
  }),
  component: AgentIAPage,
});
