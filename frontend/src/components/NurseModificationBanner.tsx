import { AlertTriangle } from "lucide-react";
import { EsiBadge } from "@/components/EsiBadge";
import type { EsiLevel } from "@/types";

export function NurseModificationBanner({
  niveauIA,
  niveauInfirmiere,
  motifModification,
}: {
  niveauIA: EsiLevel;
  niveauInfirmiere: EsiLevel;
  motifModification: string | null;
}) {
  return (
    <div className="mt-6 rounded-xl border border-esi-3/30 bg-esi-3/10 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-esi-3">
        <AlertTriangle className="size-4" />
        Niveau modifié par l'infirmière
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Suggestion IA</p>
          <div className="mt-1.5">
            <EsiBadge level={niveauIA} withLabel />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Décision infirmière</p>
          <div className="mt-1.5">
            <EsiBadge level={niveauInfirmiere} withLabel />
          </div>
        </div>
      </div>

      {motifModification && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Justification clinique</p>
          <p className="mt-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground">
            {motifModification}
          </p>
        </div>
      )}
    </div>
  );
}
