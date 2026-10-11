import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth, useHydrated } from "@/lib/store";
import type { Role } from "@/types";

const SERVICE: Record<Role, string> = {
  infirmier: "Infirmier(ère) · Service des urgences",
  medecin: "Médecin urgentiste · Service des urgences",
  admin: "Administrateur · Système MediFlow",
};

export function AppShell({
  allow,
  title,
  subtitle,
  children,
}: {
  allow: Role[];
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const auth = useAuth();
  const hydrated = useHydrated();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    if (!auth) navigate({ to: "/" });
    else if (!allow.includes(auth.role)) {
      const home =
        auth.role === "admin"
          ? "/administration"
          : auth.role === "medecin"
            ? "/dashboard"
            : "/dashboard";
      navigate({ to: home });
    }
  }, [auth, allow, navigate, hydrated]);

  if (!auth || !allow.includes(auth.role)) {
    return <div className="min-h-screen bg-background" />;
  }

  const now = new Date();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="rounded-lg border border-border bg-background px-4 py-2 text-right">
            <p className="text-sm font-medium text-foreground">{SERVICE[auth.role]}</p>
            <p className="text-xs text-muted-foreground">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}{" "}
              · {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
