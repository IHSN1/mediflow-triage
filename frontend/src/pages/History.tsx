import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Download, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { deleteHistoryEntry, exportToCSV, fetchHistory } from "@/api/history";
import { AppShell } from "@/components/AppShell";
import { EsiBadge } from "@/components/EsiBadge";
import { NurseModificationBanner } from "@/components/NurseModificationBanner";
import { TriageResultView } from "@/components/TriageResultView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { EsiLevel, HistoryEntry, Role, TriageResult } from "@/types";

type SortKey = "date" | "patient" | "chief_complaint" | "niveau_infirmiere";

/**
 * Composant partagé entre les pages "Historique" (infirmier, ses propres triages) et
 * "Liste des patients" (médecin, tous les triages du service) — seul le `scope` change
 * l'endpoint appelé et le titre affiché, toute la logique d'affichage/filtre/tri/suppression
 * est commune.
 *
 * Rôle : liste les triages déjà validés (jamais ceux en cours), avec recherche texte, filtre
 * par niveau ESI, tri par colonne, export CSV, suppression et un panneau de détail complet
 * pour chaque ligne.
 *
 * Données reçues/envoyées : `fetchHistory({ scope })` appelle `GET /api/history` (infirmier)
 * ou `GET /api/patients` (médecin) selon `scope`, et renvoie les triages déjà filtrés
 * côté serveur à ceux effectivement validés (`niveau_infirmiere` renseigné). La colonne
 * "ESI" et le filtre par niveau affichent `niveau_infirmiere` (la décision finale de
 * l'infirmière), jamais `niveau_final`/`niveau_ia` (la suggestion brute de l'IA) — c'est le
 * niveau retenu par l'infirmière qui doit apparaître dans un historique de décisions
 * cliniques. Le détail d'une ligne recompose un {@link TriageResult} complet à partir des
 * données déjà sauvegardées (pas de nouvel appel réseau, pour ne pas régénérer un résumé IA
 * différent de celui réellement validé) et affiche {@link NurseModificationBanner} seulement
 * si `niveau_infirmiere` diffère de `niveau_ia`.
 *
 * Choix d'architecture : un seul composant paramétré par `scope` plutôt que deux pages
 * dupliquées — évite la divergence progressive de deux implémentations qui font strictement
 * la même chose avec juste une portée de données différente.
 */
export function HistoryPage({
  scope,
  allow,
  title,
  subtitle,
}: {
  scope: "mine" | "service";
  allow: Role[];
  title: string;
  subtitle: string;
}) {
  const [rows, setRows] = useState<HistoryEntry[] | null>(null);
  const [search, setSearch] = useState("");
  const [esi, setEsi] = useState<EsiLevel | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "date", asc: false });
  const [toDelete, setToDelete] = useState<HistoryEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<HistoryEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Reconstruit le TriageResult à partir des données réellement sauvegardées lors de la
  // validation infirmière — pas de nouvel appel API qui renverrait un résultat différent.
  const detailResult: TriageResult | null = detailEntry
    ? {
        id: detailEntry.id,
        niveau_xgboost_brut: detailEntry.niveau_xgboost_brut,
        niveau_final: detailEntry.niveau_final,
        niveau_ia: detailEntry.niveau_ia,
        niveau_infirmiere: detailEntry.niveau_infirmiere,
        motif_modification: detailEntry.motif_modification,
        regle_declenchee: detailEntry.regle_declenchee,
        details_regle: detailEntry.details_regle,
        news2_score: detailEntry.news2_score,
        resume_clinique: detailEntry.resume_clinique,
      }
    : null;

  useEffect(() => {
    fetchHistory({ scope }).then(setRows);
  }, [scope]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (rows ?? []).filter(
      (r) =>
        (esi === "all" || r.niveau_infirmiere === esi) &&
        (!q ||
          r.patient.toLowerCase().includes(q) ||
          r.chief_complaint.toLowerCase().includes(q) ||
          r.resume_clinique.toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.asc ? cmp : -cmp;
    });
  }, [rows, search, esi, sort]);

  function openDetail(entry: HistoryEntry) {
    setDetailEntry(entry);
    setDetailOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    try {
      await deleteHistoryEntry(scope, id);
      setRows((r) => (r ?? []).filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de supprimer ce triage.");
      return;
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "date", label: "Date" },
    { key: "patient", label: "Patient" },
    { key: "chief_complaint", label: "Motif" },
    { key: "niveau_infirmiere", label: "ESI" },
  ];

  return (
    <AppShell allow={allow} title={title} subtitle={subtitle}>
      <Card className="rounded-xl border-border p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher un patient, un motif, un résumé…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", 1, 2, 3, 4, 5] as const).map((lvl) => (
              <button
                key={String(lvl)}
                onClick={() => setEsi(lvl as EsiLevel | "all")}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  esi === lvl
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {lvl === "all" ? "Tous" : `ESI ${lvl}`}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => exportToCSV(filtered)}>
            <Download className="size-4" />
            Exporter CSV
          </Button>
        </div>

        <div className="mt-6 overflow-x-auto">
          {!rows ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  {columns.map((c) => (
                    <th key={c.key} className="py-2.5 pr-4 font-medium">
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() =>
                          setSort((s) => ({ key: c.key, asc: s.key === c.key ? !s.asc : true }))
                        }
                      >
                        {c.label}
                        <ArrowUpDown className="size-3" />
                      </button>
                    </th>
                  ))}
                  <th className="py-2.5 pr-4 font-medium">Résumé</th>
                  <th className="py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.session_id}
                    onClick={() => openDetail(r)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/60"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">{r.date}</td>
                    <td className="py-3 pr-4 font-medium text-foreground">{r.patient}</td>
                    <td className="max-w-56 truncate py-3 pr-4">{r.chief_complaint}</td>
                    <td className="py-3 pr-4">
                      <EsiBadge level={r.niveau_infirmiere} />
                    </td>
                    <td className="max-w-72 truncate py-3 pr-4 text-muted-foreground">
                      {r.resume_clinique}
                    </td>
                    <td className="py-3">
                      <button
                        aria-label="Supprimer ce triage"
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-danger-surface hover:text-esi-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setToDelete(r);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      Aucun triage ne correspond aux filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce triage ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Détail du triage</DialogTitle>
          </DialogHeader>
          {detailResult && detailEntry ? (
            <>
              <TriageResultView result={detailResult} />
              {detailEntry.niveau_infirmiere !== detailEntry.niveau_ia && (
                <NurseModificationBanner
                  niveauIA={detailEntry.niveau_ia}
                  niveauInfirmiere={detailEntry.niveau_infirmiere}
                  motifModification={detailEntry.motif_modification}
                />
              )}
            </>
          ) : (
            <Skeleton className="h-64 rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
