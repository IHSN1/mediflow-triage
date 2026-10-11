import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Bot, Check, Send } from "lucide-react";
import { TRIAGE_STEPS, respondToTriage } from "@/api/triage";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { setTriageSession, useTriageSession } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Msg {
  from: "agent" | "nurse";
  text: string;
}

/**
 * Page "Agent IA" — dialogue guidé entre l'agent conversationnel (Mistral, côté service IA)
 * et l'infirmière qui relaie les réponses du patient (rôle infirmier uniquement).
 *
 * Rôle : affiche la conversation (jusqu'à 5 questions) sous forme de chat, fait progresser
 * une barre d'avancement, et affiche le contexte patient (signes vitaux) en aparté pour
 * repérage visuel rapide des valeurs anormales (badges rouges via {@link Row}).
 *
 * Données reçues/envoyées : lit la session de triage en cours ({@link useTriageSession},
 * remplie par `NewPatient.tsx`) — sans session active, redirige vers un état vide. Chaque
 * réponse saisie est envoyée via `respondToTriage()` à `POST /api/triage/respond` ; la
 * question suivante (ou le signal `finished`) revient dans la réponse et met à jour la
 * session partagée (`setTriageSession`) pour que `Result.tsx` retrouve tout l'historique
 * question/réponse au moment de composer le résumé clinique.
 *
 * Choix d'architecture : la première question n'est PAS re-demandée ici — elle a déjà été
 * obtenue par `NewPatient.tsx` via `POST /api/triage/start` et stockée dans la session ; la
 * relire évite un second appel qui créerait un second triage en base pour la même visite
 * (garde `started`, une ref plutôt qu'un state pour survivre aux doubles rendus React).
 */
export function AgentIAPage() {
  const navigate = useNavigate();
  const session = useTriageSession();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [answer, setAnswer] = useState("");
  const [asked, setAsked] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // La première question a déjà été obtenue par NewPatient.tsx (POST /api/triage/start) et
  // stockée dans la session : la réutiliser ici évite un second appel startTriage() qui créerait
  // un deuxième triage en base (avec un session_id différent) pour la même visite patient.
  useEffect(() => {
    if (!session || started.current) return;
    started.current = true;
    setMessages([{ from: "agent", text: session.question }]);
    setAsked(1);
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    if (!answer.trim() || !session || loading) return;
    const text = answer.trim();
    const lastQuestion = messages[messages.length - 1]?.text ?? "";
    setAnswer("");
    setError(false);
    setMessages((m) => [...m, { from: "nurse", text }]);
    setLoading(true);
    try {
      const res = await respondToTriage(session.session_id, text, asked);
      setMessages((m) => [...m, { from: "agent", text: res.question }]);
      const qa = [...(session.qa ?? []), { question: lastQuestion, answer: text }];
      if (res.finished) {
        setFinished(true);
        setTriageSession({ ...session, finished: true, qa });
      } else {
        setTriageSession({ ...session, qa });
        setAsked((a) => a + 1);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const patient = session?.patient;
  const current = Math.min(asked, TRIAGE_STEPS.length);

  return (
    <AppShell
      allow={["infirmier"]}
      title="Agent IA — Interrogatoire structuré"
      subtitle="Dialogue guidé avec le patient, conduit par l'agent conversationnel"
    >
      {!session ? (
        <Card className="rounded-xl border-border p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Aucune session de triage en cours.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/nouveau-patient" })}>
            Démarrer un nouveau patient
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="flex h-[36rem] flex-col rounded-xl border-border p-6 shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                QUESTION {current} SUR {TRIAGE_STEPS.length}
              </span>
              <span>{Math.round((current / TRIAGE_STEPS.length) * 100)}%</span>
            </div>
            <Progress className="mt-2" value={(current / TRIAGE_STEPS.length) * 100} />

            {error && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-esi-1/40 bg-danger-surface px-4 py-2.5 text-sm text-esi-1">
                <span className="flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  Service IA temporairement indisponible
                </span>
                <Button size="sm" variant="outline" onClick={send}>
                  Réessayer
                </Button>
              </div>
            )}

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-2.5", m.from === "nurse" && "justify-end")}>
                  {m.from === "agent" && (
                    <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="size-4 text-primary" />
                    </span>
                  )}
                  <p
                    className={cn(
                      "max-w-[75%] rounded-xl px-4 py-2.5 text-sm",
                      m.from === "agent"
                        ? "bg-muted text-foreground"
                        : "bg-sidebar text-sidebar-foreground",
                    )}
                  >
                    {m.text}
                  </p>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="size-4 text-primary" />
                  </span>
                  <span className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-3">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="size-2 animate-pulse rounded-full bg-muted-foreground/60"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">L'agent réfléchit…</span>
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Saisissez ici ce que vous dit le patient..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={finished}
              />
              <Button size="icon" onClick={send} disabled={finished || loading}>
                <Send className="size-4" />
              </Button>
            </div>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <Card className="rounded-xl border-border p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">
                Progression de l'interrogatoire
              </h2>
              <ol className="mt-4 space-y-3">
                {TRIAGE_STEPS.map((step, i) => {
                  const done = i < current - (finished ? 0 : 1) || finished;
                  return (
                    <li key={step} className="flex items-center gap-3 text-sm">
                      {done ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-esi-4/15 text-esi-4">
                          <Check className="size-3.5" />
                        </span>
                      ) : (
                        <span className="flex size-6 items-center justify-center rounded-full border border-border text-xs text-muted-foreground">
                          {i + 1}
                        </span>
                      )}
                      <span className={done ? "text-foreground" : "text-muted-foreground"}>
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <Card className="rounded-xl border-border p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Contexte patient</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <Row label="Âge" value={patient?.age != null ? `${patient.age} ans` : "—"} />
                <Row label="Sexe" value={patient?.sex ?? "—"} />
                <Row
                  label="SpO2"
                  value={patient?.o2sat != null ? `${patient.o2sat} %` : "—"}
                  danger={patient?.o2sat != null && patient.o2sat < 95}
                />
                <Row
                  label="FC"
                  value={patient?.heartrate != null ? `${patient.heartrate} bpm` : "—"}
                  danger={
                    patient?.heartrate != null &&
                    (patient.heartrate < 50 || patient.heartrate > 100)
                  }
                />
                <Row
                  label="Température"
                  value={patient?.temperature != null ? `${patient.temperature} °C` : "—"}
                  danger={
                    patient?.temperature != null &&
                    (patient.temperature < 36 || patient.temperature > 38.3)
                  }
                />
                <Row label="Douleur" value={patient?.pain != null ? `${patient.pain}/10` : "—"} />
              </dl>
            </Card>

            {finished && (
              <Button className="w-full" onClick={() => navigate({ to: "/resultat" })}>
                Voir le résultat du triage →
              </Button>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium text-foreground", danger && "text-esi-1")}>{value}</dd>
    </div>
  );
}
