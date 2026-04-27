// ============================================================
// src/lib/api-helpers.ts — Utilitaires partagés pour les API routes
// ============================================================

// --------------- Headers de sécurité ---------------

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Headers JSON avec sécurité */
export function jsonHeaders(): Record<string, string> {
  return { ...SECURITY_HEADERS };
}

// --------------- Réponses standardisées ---------------

/** Réponse JSON réussie */
export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders(),
  });
}

/** Réponse d'erreur JSON */
export function jsonError(error: string, status = 500, log?: unknown): Response {
  return new Response(JSON.stringify({ error, ...(log ? { log } : {}) }), {
    status,
    headers: jsonHeaders(),
  });
}

/** Réponse preflight CORS (pour les requêtes OPTIONS) */
export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders(),
  });
}

// --------------- Validation ---------------

/** Vérifie que les variables d'environnement Shopify sont configurées */
export function assertShopifyConfig(): { ok: true } | { ok: false; response: Response } {
  const store = import.meta.env.SHOPIFY_STORE_URL;
  const token = import.meta.env.SHOPIFY_ACCESS_TOKEN;

  if (!store || !token) {
    return {
      ok: false,
      response: jsonError(
        'Configuration Shopify manquante. Vérifiez SHOPIFY_STORE_URL et SHOPIFY_ACCESS_TOKEN dans .env',
        503,
      ),
    };
  }

  return { ok: true };
}

/** Parse le body JSON avec gestion d'erreur */
export async function safeJsonParse<T = Record<string, unknown>>(
  request: Request,
): Promise<{ data: T; error: null } | { data: null; error: Response }> {
  try {
    const data = (await request.json()) as T;
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: jsonError('Body JSON invalide ou manquant', 400),
    };
  }
}
