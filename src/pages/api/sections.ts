// ============================================================
// GET     /api/sections  — Liste des sections du magasin
// OPTIONS /api/sections  — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { dbAll } from '../../lib/db';
import { authenticateRequest } from '../../lib/auth';
import { jsonOk, jsonError, corsPreflightResponse } from '../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

export const GET: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  const sections = await dbAll('SELECT * FROM sections ORDER BY numero');
  return jsonOk({ sections });
};
