import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Activity, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import heroImage from "@/assets/er-corridor.jpg";
import { login } from "@/api/auth";
import { ApiError } from "@/api/client";
import { setAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Page de connexion — point d'entrée unique de l'application, avant tout accès aux pages
 * protégées par rôle.
 *
 * Rôle : authentifie l'utilisateur (email + mot de passe) et redirige vers l'espace adapté
 * à son rôle (`/administration` pour un admin, `/dashboard` pour infirmier/médecin).
 *
 * Données envoyées/reçues : `login(email, password)` appelle `POST /api/auth/login`
 * (backend Spring Boot). La réponse (token JWT, rôle, identifiant, nom complet) est stockée
 * dans le store client ({@link setAuth}, persisté en sessionStorage) — c'est ce token que
 * `client.ts` rattache ensuite à chaque appel API (`Authorization: Bearer <token>`).
 *
 * Choix d'architecture : `setAuth(null)` est appelé au montage pour effacer toute session
 * précédente — revenir sur `/login` doit toujours repartir d'un état déconnecté, même si un
 * token valide traînait encore en mémoire (ex. après un clic sur "précédent" du navigateur).
 * Les valeurs par défaut des champs email/mot de passe correspondent au compte de
 * démonstration infirmier, pour accélérer les tests manuels — à retirer avant un
 * déploiement réel.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("infermier@mediflow.ma");
  const [password, setPassword] = useState("mediflow123");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuth(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      setAuth(user);
      navigate({ to: user.role === "admin" ? "/administration" : "/dashboard" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connexion impossible — réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-card">
      {/* Panneau gauche */}
      <div className="relative hidden w-3/5 lg:block">
        <img
          src={heroImage}
          alt="Couloir d'un service d'urgences hospitalières avec du personnel médical au travail"
          width={1280}
          height={1600}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-sidebar/70" />
      </div>

      {/* Panneau droit */}
      <div className="flex w-full flex-col items-center justify-center gap-6 px-8 py-10 lg:w-2/5">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            <Activity className="size-8 text-primary" strokeWidth={2.5} />
            <span className="text-3xl font-bold tracking-tight text-foreground">
              MediFlow <span className="text-primary">AI</span>
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Système de triage médical selon l'échelle ESI
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card"
        >
          <h2 className="text-center text-2xl font-semibold text-foreground">
            Connexion à votre espace
          </h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Accédez à votre tableau de bord sécurisé
          </p>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@chu.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              Se souvenir de moi
            </label>
            <button type="button" className="text-sm text-primary hover:underline">
              Mot de passe oublié ?
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-esi-1/40 bg-danger-surface px-3 py-2 text-sm text-esi-1">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            <Lock className="size-4" />
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Connexion sécurisée • Vos données sont protégées
        </p>
      </div>
    </div>
  );
}
