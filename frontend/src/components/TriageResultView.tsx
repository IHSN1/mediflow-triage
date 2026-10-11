import { ESI_LABELS, EsiBadge } from "@/components/EsiBadge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TriageResult } from "@/types";

/**
 * Seuils cliniques NEWS2 (voir ai-service/src/safety_rules.py) : le score
 * total détermine à lui seul le niveau d'alerte, indépendamment du fait que
 * XGBoost ait ou non déjà prédit ce niveau (auquel cas regle_declenchee
 * reste null côté backend puisqu'aucune escalade n'a été nécessaire — le
 * texte affiché ici ne doit donc jamais dépendre de regle_declenchee seul).
 */
function news2Tier(score: number): "critical" | "urgent" | "none" {
  if (score >= 7) return "critical";
  if (score >= 5) return "urgent";
  return "none";
}

function news2Message(score: number): string {
  switch (news2Tier(score)) {
    case "critical":
      return `NEWS2 Score = ${score} — Intervention immédiate → ESI 1`;
    case "urgent":
      return `NEWS2 Score = ${score} — Médecin notifié → ESI 2 minimum`;
    default:
      return `NEWS2 Score = ${score} — Aucune escalade nécessaire`;
  }
}

export function TriageResultView({ result }: { result: TriageResult }) {
  const score = result.news2_score;
  const tier = score != null ? news2Tier(score) : null;
  const alarming = tier === "critical" || tier === "urgent";
  const summaryPoints = result.resume_clinique.split("\n").filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border-border p-8 text-center shadow-sm">
          <EsiBadge level={result.niveau_final} size="lg" />
          <p className="mt-3 text-xl font-semibold text-foreground">
            {ESI_LABELS[result.niveau_final]}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Priorisation validée par les règles cliniques de sécurité. Confirmation attendue par le
            clinicien.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 text-left">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Prédiction XGBoost brute</p>
              <div className="mt-2">
                <EsiBadge level={result.niveau_xgboost_brut} withLabel />
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Après règles de sécurité</p>
              <div className="mt-2">
                <EsiBadge level={result.niveau_final} withLabel />
              </div>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            "rounded-xl border-border p-6 shadow-sm",
            alarming &&
              (tier === "critical"
                ? "border-esi-1/30 bg-danger-surface"
                : "border-esi-2/30 bg-esi-2/10"),
          )}
        >
          <h2 className="text-sm font-semibold text-foreground">Explicabilité</h2>

          {score == null ? (
            <p className="mt-4 text-sm text-muted-foreground">Score NEWS2 indisponible.</p>
          ) : tier === "none" ? (
            <p className="mt-4 text-sm text-muted-foreground">{news2Message(score)}</p>
          ) : (
            <span
              className={cn(
                "mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground",
                tier === "critical" ? "bg-esi-1" : "bg-esi-2",
              )}
            >
              {news2Message(score)}
            </span>
          )}

          {result.regle_declenchee && (
            <p className="mt-2 text-sm text-muted-foreground">
              Règle déclenchée :{" "}
              <span className="font-medium text-foreground">{result.regle_declenchee}</span>
            </p>
          )}

          {result.details_regle.length > 0 && (
            <ul className="mt-4 space-y-2">
              {result.details_regle.map((d) => (
                <li
                  key={d}
                  className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground"
                >
                  {d}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Le clinicien conserve la décision finale. Les règles de sécurité ne se substituent pas
            au jugement médical.
          </p>
        </Card>
      </div>

      <Card className="rounded-xl border-border p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Résumé clinique structuré</h2>
        <ol className="mt-4 space-y-3">
          {summaryPoints.map((point, i) => (
            <li key={i} className="flex gap-3 text-sm text-foreground">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span>{point.replace(/^\d\)\s*/, "")}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
