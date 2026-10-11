/**
 * Client HTTP partagé par tous les modules src/api/* pour appeler le
 * backend Spring Boot (gateway vers le service IA FastAPI, voir
 * mediflow-backend/README.md). Le frontend n'appelle jamais FastAPI
 * directement.
 */
export const API_SPRING_BASE_URL = "http://localhost:8080";

/** Lit le JWT courant depuis le même stockage que useAuth() (lib/store.ts), sans dépendre de React. */
function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("mediflow.auth");
    if (!raw) return null;
    return (JSON.parse(raw) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Pour les endpoints qui renvoient un fichier (ex: export CSV) plutôt que du JSON. */
  raw?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = readToken();

  const res = await fetch(`${API_SPRING_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    // Corps d'erreur { status, message } (GlobalExceptionHandler#handleResponseStatusException)
    // ou { error, message } quand le service IA FastAPI est indisponible (503).
    let message = `Erreur ${res.status}`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      if (body.message) message = body.message;
      code = body.error;
    } catch {
      /* corps non-JSON : on garde le message générique */
    }
    throw new ApiError(message, res.status, code);
  }

  if (options.raw) {
    return (await res.blob()) as T;
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body ?? {} }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** Télécharge une réponse fichier (ex: /export) et retourne le Blob brut. */
  getBlob: (path: string) => request<Blob>(path, { raw: true }),
};
