import { useEffect, useState } from "react";
import { AlertTriangle, Clock, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchDashboardStats } from "@/api/dashboard";
import { AppShell } from "@/components/AppShell";
import { EsiBadge } from "@/components/EsiBadge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types";

const ESI_COLORS = ["var(--esi-1)", "var(--esi-2)", "var(--esi-3)", "var(--esi-4)", "var(--esi-5)"];

/**
 * Page "Tableau de bord" — vue d'activité en temps réel, accessible à l'infirmier et au
 * médecin (pas à l'admin).
 *
 * Rôle : affiche 4 indicateurs clés (triages du jour, temps moyen, patients critiques
 * ESI 1-2, charge du service), un graphique de répartition par niveau ESI et les 5 derniers
 * triages.
 *
 * Données reçues : `fetchDashboardStats()` appelle `GET /api/dashboard/stats`, dont le scope
 * dépend du rôle côté backend (`DashboardService.java`) — un infirmier ne voit que son
 * activité personnelle (comme dans `/api/history`), un médecin voit l'activité de tout le
 * service (comme dans `/api/patients`). Le composant frontend ne fait aucune distinction de
 * rôle lui-même : il affiche simplement les chiffres renvoyés, déjà scopés correctement côté
 * serveur — c'est le backend qui porte la responsabilité de sécurité/isolation des données,
 * pas l'affichage.
 *
 * Choix d'architecture : un seul appel réseau au montage (pas de rafraîchissement
 * automatique) — suffisant pour un tableau de bord consulté ponctuellement, sans la
 * complexité d'un polling ou d'un websocket pour un prototype académique à faible trafic.
 */
export function DashboardPage() {
  const auth = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
  }, []);

  return (
    <AppShell
      allow={["infirmier", "medecin"]}
      title="Tableau de bord"
      subtitle={
        auth?.role === "medecin"
          ? "Vue clinique du service — activité de triage en temps réel"
          : "Activité de triage du poste infirmier"
      }
    >
      {!stats ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              icon={<Users className="size-4" />}
              label="Triages effectués"
              value={String(stats.triages_today)}
              hint="depuis 00:00"
            />
            <StatCard
              icon={<Clock className="size-4" />}
              label="Temps moyen de triage"
              value={`${stats.avg_triage_minutes.toFixed(1)} min`}
              hint="objectif < 8 min"
            />
            <StatCard
              icon={<AlertTriangle className="size-4" />}
              label="Patients critiques ESI 1-2"
              value={String(stats.critical_count)}
              hint="en cours de prise en charge"
              alert={stats.critical_count > 5}
            />
            <StatCard
              icon={<TrendingUp className="size-4" />}
              label="Charge du service"
              value={`${stats.service_load}%`}
              hint="occupation des box"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="rounded-xl border-border p-6 shadow-sm lg:col-span-2">
              <h2 className="text-sm font-semibold text-foreground">
                Répartition des patients par niveau ESI
              </h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.esi_distribution.map((d) => ({
                      name: `ESI ${d.level}`,
                      count: d.count,
                    }))}
                  >
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stats.esi_distribution.map((d) => (
                        <Cell key={d.level} fill={ESI_COLORS[d.level - 1]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Le modèle IA produit actuellement les niveaux ESI 1 à 3 — les niveaux 4 et 5 sont
                prévus dans les versions futures.
              </p>
            </Card>

            <Card className="rounded-xl border-border p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Derniers triages</h2>
              <ul className="mt-4 divide-y divide-border">
                {stats.latest.map((t) => (
                  <li key={t.session_id}>
                    <a
                      href={`/resultat?session=${t.session_id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <EsiBadge level={t.niveau_final} />
                      <span className="min-w-0 flex-1 truncate text-sm">{t.patient}</span>
                      <span className="text-xs text-muted-foreground">{t.time}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
}) {
  return (
    <Card
      className={cn(
        "rounded-xl border-border p-5 shadow-sm",
        alert && "border-esi-1/40 bg-danger-surface",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={cn("text-primary", alert && "text-esi-1")}>{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn("mt-3 text-3xl font-semibold text-foreground", alert && "text-esi-1")}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}
