import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { fetchTriageResult, validateTriage } from "@/api/triage";
import { AppShell } from "@/components/AppShell";
import { TriageResultView } from "@/components/TriageResultView";
import { TriageValidation } from "@/components/TriageValidation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildClinicalSummary } from "@/lib/clinicalSummary";
import { useAuth, useTriageSession } from "@/lib/store";
import type { EsiLevel, TriageResult } from "@/types";

/**
 * Page "Résultat" — affiche le niveau ESI suggéré par l'IA et permet à l'infirmière de le
 * confirmer ou de le corriger (dernière étape du parcours de triage, rôle infirmier et
 * médecin en lecture — le médecin y arrive depuis "Liste des patients").
 *
 * Rôle : récupère le résultat calculé par le service IA (XGBoost + règles de sécurité +
 * résumé Mistral) via `fetchTriageResult()` (`GET /api/triage/result/{sessionId}`), l'affiche
 * ({@link TriageResultView}), puis, pour l'infirmier, propose la validation finale
 * ({@link TriageValidation}) : confirmer le niveau IA ou le corriger avec un motif obligatoire.
 *
 * Données reçues/envoyées : le `sessionId` vient soit de la session de triage en cours
 * (nouveau triage), soit du paramètre d'URL `?session=` (relecture depuis l'historique). La
 * validation envoie `niveau_infirmiere`, le motif de modification éventuel et le résumé
 * clinique complet (composé côté frontend par {@link buildClinicalSummary}) à
 * `PUT /api/triage/{id}/validate` — c'est cet appel qui fait apparaître le triage dans
 * l'historique et le tableau de bord (voir HistoryService côté backend).
 *
 * Choix d'architecture : une garde par ref (`fetchedSessionId`) évite que l'effet de
 * récupération ne s'exécute deux fois pour le même `sessionId` (React re-déclenche les effets
 * en développement) — sans elle, chaque appel régénérait un nouveau résumé Mistral côté
 * FastAPI, écrasant le précédent en base de façon non déterministe.
 */
export function ResultPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const session = useTriageSession();
  const [result, setResult] = useState<TriageResult | null>(null);

  const sessionId =
    session?.session_id ??
    (typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("session") ?? "sess-001")
      : "sess-001");

  // Garde : sans elle, le résultat était récupéré deux fois pour le même sessionId (effet
  // ré-exécuté en développement), chaque appel régénérant un nouveau résumé Mistral côté
  // FastAPI et écrasant le précédent en base de façon non déterministe.
  const fetchedSessionId = useRef<string | null>(null);

  useEffect(() => {
    if (fetchedSessionId.current === sessionId) return;
    fetchedSessionId.current = sessionId;
    setResult(null);
    fetchTriageResult(sessionId).then(setResult);
  }, [sessionId]);

  // Points 1 à 3 composés à partir du formulaire patient et du dialogue agent IA ;
  // point 4 = recommandation renvoyée par le backend (result.resume_clinique).
  const clinicalSummary = result
    ? buildClinicalSummary(
        session?.patient ?? { first_name: "", last_name: "", chief_complaint: "" },
        session?.qa,
        result.resume_clinique,
      )
    : "";

  async function handleConfirmValidation(
    niveauInfirmiere: EsiLevel,
    motifModification: string | null,
  ) {
    if (!result) return;
    try {
      await validateTriage(result.id, niveauInfirmiere, motifModification, clinicalSummary);
      navigate({ to: "/historique" });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Impossible d'enregistrer la validation.",
      );
    }
  }

  return (
    <AppShell
      allow={["infirmier", "medecin"]}
      title="Résultat de triage"
      subtitle="Niveau ESI, règles de sécurité appliquées et résumé clinique"
    >
      {!result ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <>
          <TriageResultView result={{ ...result, resume_clinique: clinicalSummary }} />
          {auth?.role === "infirmier" && (
            <div className="mt-6">
              <TriageValidation
                key={sessionId}
                niveauIA={result.niveau_ia}
                onConfirm={handleConfirmValidation}
              />
            </div>
          )}
          <Card className="mt-6 flex justify-end gap-3 rounded-xl border-border p-4 shadow-sm">
            <Button
              variant="outline"
              onClick={() =>
                navigate({ to: auth?.role === "medecin" ? "/patients" : "/historique" })
              }
            >
              Historique
            </Button>
            {auth?.role === "infirmier" && (
              <Button onClick={() => navigate({ to: "/nouveau-patient" })}>Nouveau triage →</Button>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}
