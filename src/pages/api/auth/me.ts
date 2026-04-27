// ============================================================
// GET     /api/auth/me  — Renvoie l'utilisateur courant
// OPTIONS /api/auth/me  — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { authenticateRequest, findUserById, toSafeUser } from '../../../lib/auth';
import { jsonOk, jsonError, corsPreflightResponse } from '../../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

export const GET: APIRoute = async ({ request }) => {
  const payload = authenticateRequest(request);
  if (!payload) {
    return jsonError('Non authentifié', 401);
  }

  const user = findUserById(payload.userId);
  if (!user) {
    return jsonError('Utilisateur introuvable', 404);
  }

  return jsonOk({ user: toSafeUser(user) });
};
