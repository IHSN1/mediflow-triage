import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import { logout } from "@/api/auth";
import { setAuth, useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

type Item = { to: string; label: string; icon: typeof Activity };

export const NAV_BY_ROLE: Record<Role, Item[]> = {
  infirmier: [
    { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { to: "/nouveau-patient", label: "Nouveau patient", icon: UserPlus },
    { to: "/agent-ia", label: "Agent IA", icon: MessageSquareText },
    { to: "/resultat", label: "Résultat", icon: ClipboardList },
    { to: "/historique", label: "Historique", icon: Users },
  ],
  medecin: [
    { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { to: "/patients", label: "Liste des patients", icon: Users },
  ],
  admin: [{ to: "/administration", label: "Administration", icon: Settings }],
};

const ROLE_LABEL: Record<Role, string> = {
  infirmier: "Infirmier(ère)",
  medecin: "Médecin",
  admin: "Administrateur",
};

export function Sidebar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!auth) return null;

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary/15">
          <Activity className="size-5 text-sidebar-primary" strokeWidth={2.5} />
        </span>
        <span className="text-base font-semibold tracking-tight">MediFlow AI</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_BY_ROLE[auth.role].map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent">
            <Stethoscope className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{auth.fullName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{ROLE_LABEL[auth.role]}</p>
          </div>
        </div>
        <button
          onClick={() => {
            // Journalise l'événement dans audit_logs avant d'effacer le token local
            // (le backend a besoin du JWT courant pour savoir qui se déconnecte).
            logout().catch(() => {});
            setAuth(null);
            navigate({ to: "/" });
          }}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
