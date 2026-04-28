// ============================================================
// GET     /api/clients/[id] — Détail d'un client
// PUT     /api/clients/[id] — Met à jour un client
// DELETE  /api/clients/[id] — Supprime un client
// OPTIONS /api/clients/[id] — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { dbAll, dbGet, dbRun } from '../../../lib/db';
import { authenticateRequest } from '../../../lib/auth';
import {
  jsonOk,
  jsonError,
  corsPreflightResponse,
  safeJsonParse,
} from '../../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

export const GET: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const client = await dbGet('SELECT * FROM clients WHERE id = ?', [id]);
  if (!client) return jsonError('Client introuvable', 404);

  return jsonOk({ client });
};

interface UpdateClientBody {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

export const PUT: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin' && auth.role !== 'vendeur_proprietaire') {
    return jsonError('Accès refusé — rôle admin ou propriétaire requis', 403);
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const existing = await dbGet('SELECT * FROM clients WHERE id = ?', [id]);
  if (!existing) return jsonError('Client introuvable', 404);

  const parsed = await safeJsonParse<UpdateClientBody>(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const fields: string[] = [];
  const values: any[] = [];

  const allowed: (keyof UpdateClientBody)[] = ['nom', 'prenom', 'email', 'telephone', 'adresse'];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (fields.length === 0) return jsonError('Aucun champ à mettre à jour', 400);

  values.push(id);

  await dbRun(
    `UPDATE clients SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  const client = await dbGet('SELECT * FROM clients WHERE id = ?', [id]);
  return jsonOk({ client });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin') {
    return jsonError('Accès refusé — rôle admin requis', 403);
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const existing = await dbGet('SELECT id FROM clients WHERE id = ?', [id]);
  if (!existing) return jsonError('Client introuvable', 404);

  await dbRun('DELETE FROM clients WHERE id = ?', [id]);
  return jsonOk({ deleted: true, id });
};
