import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Activity, Droplets, Gauge, Heart, Thermometer, Wind } from "lucide-react";
import { toast } from "sonner";
import { startTriage } from "@/api/triage";
import { ApiError } from "@/api/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { setTriageSession } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { PatientForm } from "@/types";

const EMPTY: PatientForm = { first_name: "", last_name: "", chief_complaint: "", pain: 0 };

const VITALS: { key: keyof PatientForm; label: string; unit: string; icon: typeof Heart }[] = [
  { key: "temperature", label: "Température", unit: "°C", icon: Thermometer },
  { key: "heartrate", label: "Fréquence cardiaque", unit: "bpm", icon: Heart },
  { key: "resprate", label: "Fréquence respiratoire", unit: "/min", icon: Wind },
  { key: "o2sat", label: "SpO2", unit: "%", icon: Droplets },
  { key: "sbp", label: "TA Systolique", unit: "mmHg", icon: Gauge },
  { key: "dbp", label: "TA Diastolique", unit: "mmHg", icon: Gauge },
];

/**
 * Page "Nouveau patient" — première étape du parcours de triage (rôle infirmier uniquement).
 *
 * Rôle : recueille l'identité, le motif de consultation (seul champ obligatoire) et les
 * signes vitaux du patient à l'accueil. Ne fait aucun calcul de triage elle-même.
 *
 * Données envoyées : au clic sur "Lancer l'agent IA", le formulaire ({@link PatientForm})
 * est envoyé via `startTriage()` à `POST /api/triage/start` (backend Spring Boot, qui relaie
 * à son tour au service IA FastAPI). La réponse (session_id + première question de l'agent)
 * est stockée dans le store client ({@link setTriageSession}) puis la navigation continue
 * vers `/agent-ia`, qui lit cette session pour démarrer le dialogue.
 *
 * Choix d'architecture : le formulaire est un state React local (pas de gestion de formulaire
 * externe type react-hook-form) — assez simple pour ne pas justifier une dépendance
 * supplémentaire. Le garde `submitting` (useRef, pas useState) évite qu'un double-clic rapide
 * ne déclenche deux triages distincts avant que le bouton "disabled" ne se mette à jour.
 */
export function NewPatientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PatientForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  // Garde synchrone (ref, pas state) : un state React ne re-rend le bouton désactivé
  // qu'au prochain tick, donc un double-clic très rapide pourrait sinon déclencher
  // deux triages distincts côté backend avant que le bouton ne se désactive réellement.
  const submitting = useRef(false);

  const set = <K extends keyof PatientForm>(key: K, value: PatientForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const num = (v: string) => (v === "" ? undefined : Number(v));

  async function handleStart() {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      const res = await startTriage(form);
      setTriageSession({
        session_id: res.session_id,
        question: res.question,
        patient: form,
        finished: false,
      });
      navigate({ to: "/agent-ia" });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Impossible de démarrer le triage — réessayez.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <AppShell
      allow={["infirmier"]}
      title="Nouveau patient"
      subtitle="Saisie de l'accueil — identité, motif et signes vitaux"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border-border p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Identité & motif</h2>
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom" required>
                <Input
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </Field>
              <Field label="Nom" required>
                <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
              </Field>
            </div>
            <Field label="Âge">
              <Input
                type="number"
                min={0}
                value={form.age ?? ""}
                onChange={(e) => set("age", num(e.target.value))}
              />
            </Field>
            <div>
              <Label className="text-xs text-muted-foreground">Sexe</Label>
              <div className="mt-2 flex gap-2">
                {(["M", "F"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("sex", s)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      form.sex === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Motif de consultation <span className="text-esi-1">★ Obligatoire</span>
              </Label>
              <Textarea
                className="mt-2 min-h-32"
                placeholder="Ex : douleur thoracique irradiante vers le bras gauche depuis 2 heures"
                value={form.chief_complaint}
                onChange={(e) => set("chief_complaint", e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Les informations saisies sont éphémères tant que le triage n'est pas validé.
            </p>
          </div>
        </Card>

        <Card className="rounded-xl border-border p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Signes vitaux</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tous facultatifs — laissez vide si non mesurés
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {VITALS.map((v) => (
              <div key={v.key}>
                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <v.icon className="size-3.5 text-primary" />
                  {v.label} ({v.unit})
                </Label>
                <Input
                  className="mt-2"
                  type="number"
                  step="0.1"
                  value={(form[v.key] as number | undefined) ?? ""}
                  onChange={(e) => set(v.key, num(e.target.value) as never)}
                />
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="size-3.5 text-primary" />
                Douleur (0 à 10)
              </Label>
              <span className="text-2xl font-semibold text-esi-1">{form.pain ?? 0}</span>
            </div>
            <Slider
              className="mt-3"
              min={0}
              max={10}
              step={1}
              value={[form.pain ?? 0]}
              onValueChange={([v]) => set("pain", v)}
            />
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setForm(EMPTY)}>
              Réinitialiser
            </Button>
            <Button
              onClick={handleStart}
              disabled={
                !form.chief_complaint.trim() ||
                !form.first_name.trim() ||
                !form.last_name.trim() ||
                loading
              }
            >
              {loading ? "Démarrage…" : "Lancer l'agent IA →"}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">
        {label} {required && <span className="text-esi-1">★</span>}
      </Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
