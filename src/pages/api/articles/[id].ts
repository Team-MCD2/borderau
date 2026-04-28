// ============================================================
// GET     /api/articles/[id] — Détail d'un article
// PUT     /api/articles/[id] — Met à jour un article
// DELETE  /api/articles/[id] — Supprime un article
// OPTIONS /api/articles/[id] — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { dbGet, dbRun } from '../../../lib/db';
import { authenticateRequest } from '../../../lib/auth';
import {
  jsonOk,
  jsonError,
  corsPreflightResponse,
  safeJsonParse,
} from '../../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

// --------------- GET ---------------
export const GET: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);
  if (auth.role === 'livreur') return jsonError('Accès refusé', 403);

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const article = await dbGet(
    `SELECT a.*, c.nom AS categorie_nom
     FROM articles a
     LEFT JOIN categories c ON c.id = a.categorie_id
     WHERE a.id = ?`,
    [id],
  );

  if (!article) return jsonError('Article introuvable', 404);
  return jsonOk({ article });
};

// --------------- PUT ---------------
export const PUT: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);
  if (auth.role === 'livreur') return jsonError('Accès refusé', 403);

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const existing = await dbGet('SELECT id FROM articles WHERE id = ?', [id]);
  if (!existing) return jsonError('Article introuvable', 404);

  const parsed = await safeJsonParse<Record<string, unknown>>(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;

  const allowed = [
    'description', 'marque', 'modele', 'categorie_id',
    'couleur_id', 'ref_couleur', 'prix_achat', 'prix_vente',
    'code_barres', 'photo_url', 'quantite', 'taille', 'taille_canape',
  ];

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (fields.length === 0) return jsonError('Aucun champ à mettre à jour', 400);

  values.push(id);

  await dbRun(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`, values as any[]);

  const article = await dbGet(
    `SELECT a.*, c.nom AS categorie_nom
     FROM articles a
     LEFT JOIN categories c ON c.id = a.categorie_id
     WHERE a.id = ?`,
    [id],
  );

  return jsonOk({ article });
};

// --------------- DELETE ---------------
export const DELETE: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin' && auth.role !== 'vendeur_proprietaire') {
    return jsonError('Accès refusé', 403);
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const existing = await dbGet('SELECT id FROM articles WHERE id = ?', [id]);
  if (!existing) return jsonError('Article introuvable', 404);

  await dbRun('DELETE FROM articles WHERE id = ?', [id]);
  return jsonOk({ deleted: true, id });
};
