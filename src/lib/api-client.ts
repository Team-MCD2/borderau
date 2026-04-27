// ============================================================
// src/lib/api-client.ts — Client-side fetch wrapper with JWT auth
// ============================================================

/** Returns auth headers with Bearer token from localStorage */
export function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('decoshop_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Authenticated fetch wrapper */
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<{ data: T; ok: true } | { error: string; status: number; ok: false }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers ?? {}),
      },
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json.error || `Erreur HTTP ${res.status}`, status: res.status, ok: false };
    }

    return { data: json as T, ok: true };
  } catch {
    return { error: 'Impossible de contacter le serveur', status: 0, ok: false };
  }
}

/** GET helper */
export function apiGet<T = any>(url: string) {
  return apiFetch<T>(url, { method: 'GET' });
}

/** POST helper */
export function apiPost<T = any>(url: string, body: unknown) {
  return apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

/** PUT helper */
export function apiPut<T = any>(url: string, body: unknown) {
  return apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body) });
}

/** DELETE helper */
export function apiDelete<T = any>(url: string) {
  return apiFetch<T>(url, { method: 'DELETE' });
}

/** Get current user from localStorage */
export function getCurrentUser(): { id: number; email: string; role: string; first_name: string; last_name: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('decoshop_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
