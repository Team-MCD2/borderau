// ============================================================
// GET     /api/clients      — Liste des clients
// POST    /api/clients      — Crée un nouveau client
// OPTIONS /api/clients      — Preflight CORS
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

export const GET: APIRoute = async ({ request, url }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  const search = url.searchParams.get('search');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    where += ' AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const rows = await dbAll(
    `SELECT * FROM clients ${where} ORDER BY created_at DESC LIMIT ?`,
    [...params, limit]
  );

  return jsonOk({ clients: rows });
};

interface CreateClientBody {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
}

export const POST: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin' && auth.role !== 'vendeur_proprietaire') {
    return jsonError('Accès refusé — rôle admin ou propriétaire requis', 403);
  }

  const parsed = await safeJsonParse<CreateClientBody>(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;

  if (!body.nom) {
    return jsonError('nom requis', 400);
  }

  const result = await dbRun(
    `INSERT INTO clients (nom, prenom, email, telephone, adresse) VALUES (?, ?, ?, ?, ?)`,
    [body.nom, body.prenom ?? '', body.email ?? '', body.telephone ?? '', body.adresse ?? '']
  );

  const client = await dbGet('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]);
  return jsonOk({ client }, 201);
};
