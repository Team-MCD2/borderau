// ============================================================
// GET     /api/users  — Liste des utilisateurs (admin only)
// OPTIONS /api/users  — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { authenticateRequest, getAllUsers } from '../../lib/auth';
import { jsonOk, jsonError, corsPreflightResponse } from '../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

export const GET: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin') {
    return jsonError('Accès refusé — rôle admin requis', 403);
  }

  const users = getAllUsers();
  return jsonOk({ users });
};
