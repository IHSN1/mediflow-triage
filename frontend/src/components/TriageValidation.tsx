import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ESI_LABELS, EsiBadge } from "@/components/EsiBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EsiLevel } from "@/types";

const ESI_LEVELS: EsiLevel[] = [1, 2, 3, 4, 5];

export function TriageValidation({
  niveauIA,
  onConfirm,
}: {
  niveauIA: EsiLevel;
  onConfirm: (niveauInfirmiere: EsiLevel, motifModification: string | null) => Promise<void>;
}) {
  const [niveauRetenu, setNiveauRetenu] = useState<EsiLevel>(niveauIA);
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const changed = niveauRetenu !== niveauIA;
  const motifValide = !changed || motif.trim().length > 0;

  async function handleConfirm() {
    if (!motifValide || saving) return;
    setSaving(true);
    await onConfirm(niveauRetenu, changed ? motif.trim() : null);
    setSaving(false);
    setSaved(true);
  }

  return (
    <Card className="rounded-xl border-border p-6 shadow-sm">
      <h2 className="font-bold text-foreground">Validation du triage</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Niveau ESI suggéré par l'IA</Label>
          <div className="mt-2">
            <EsiBadge level={niveauIA} withLabel />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Niveau ESI retenu</Label>
          <Select
            value={String(niveauRetenu)}
            onValueChange={(v) => setNiveauRetenu(Number(v) as EsiLevel)}
            disabled={saved}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESI_LEVELS.map((lvl) => (
                <SelectItem key={lvl} value={String(lvl)}>
                  ESI {lvl} · {ESI_LABELS[lvl]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-2">
            <EsiBadge level={niveauRetenu} withLabel />
          </div>
        </div>
      </div>

      {changed && (
        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">
            Motif de modification <span className="text-esi-1">★ Obligatoire</span>
          </Label>
          <Textarea
            className="mt-2"
            placeholder="Expliquez pourquoi vous modifiez le niveau..."
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            disabled={saved}
          />
        </div>
      )}

      {saved ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-esi-4/30 bg-esi-4/10 px-4 py-3 text-sm font-medium text-esi-4">
          <CheckCircle2 className="size-5" />
          Triage validé et enregistré dans l'historique
        </div>
      ) : (
        <Button className="mt-5 w-full" disabled={!motifValide || saving} onClick={handleConfirm}>
          {saving ? "Enregistrement…" : "Confirmer et enregistrer"}
        </Button>
      )}
    </Card>
  );
}
