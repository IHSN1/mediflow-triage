import { useEffect, useState, useSyncExternalStore } from "react";
import type { AuthUser, PatientForm } from "@/types";

/**
 * store.ts — état client partagé entre les pages, sans backend dédié.
 *
 * Rôle : expose deux stores indépendants — la session d'authentification ({@link useAuth},
 * rempli par `Login.tsx`) et la session de triage en cours ({@link useTriageSession}, remplie
 * par `NewPatient.tsx` puis mise à jour par `AgentIA.tsx` et lue par `Result.tsx`). Chacun
 * est persisté dans `sessionStorage` (pas `localStorage`) : la session ne doit pas survivre à
 * la fermeture de l'onglet, cohérent avec un usage en poste de soins partagé.
 *
 * Données : aucune donnée n'est envoyée au backend depuis ce fichier — il ne fait que relire
 * ce que `Login.tsx`/`NewPatient.tsx`/`AgentIA.tsx` y ont écrit après leurs propres appels API,
 * et le republie aux composants abonnés via `useSyncExternalStore`.
 *
 * Choix d'architecture : un store maison minimal plutôt qu'une librairie de gestion d'état
 * (Redux, Zustand...) — deux valeurs partagées, pas de logique de dérivation complexe entre
 * elles ; `useSyncExternalStore` est l'API React native pour ce cas, sans dépendance
 * supplémentaire. `getServerSnapshot` renvoie toujours la valeur initiale (jamais celle de
 * sessionStorage, indisponible côté serveur) pour rester cohérent entre le rendu SSR et la
 * première hydratation côté client (voir {@link useHydrated}).
 */
function createStore<T>(key: string, initial: T) {
function createStore<T>(key: string, initial: T) {
  let value: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (!loaded && typeof window !== "undefined") {
      loaded = true;
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        try {
          value = JSON.parse(raw) as T;
        } catch {
          /* ignore */
        }
      }
    }
    return value;
  };

  return {
    get: read,
    getServerSnapshot: () => initial,
    set(next: T) {
      value = next;
      loaded = true;
      if (typeof window !== "undefined") {
        if (next === null) window.sessionStorage.removeItem(key);
        else window.sessionStorage.setItem(key, JSON.stringify(next));
      }
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

const authStore = createStore<AuthUser | null>("mediflow.auth", null);

export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.get, authStore.getServerSnapshot);
}

/** true une fois que le store client a été lu (évite les redirections avant hydratation) */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
export const setAuth = (user: AuthUser | null) => authStore.set(user);

export interface TriageQA {
  question: string;
  answer: string;
}

export interface TriageSession {
  session_id: string;
  /** Première question renvoyée par POST /api/triage/start — évite à AgentIA de rappeler startTriage(). */
  question: string;
  patient: PatientForm;
  finished: boolean;
  qa?: TriageQA[];
}

const sessionStore = createStore<TriageSession | null>("mediflow.session", null);

export function useTriageSession() {
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.get,
    sessionStore.getServerSnapshot,
  );
}
export const setTriageSession = (s: TriageSession | null) => sessionStore.set(s);
