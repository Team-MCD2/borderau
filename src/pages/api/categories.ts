// ============================================================
// GET     /api/categories  — Liste des catégories
// POST    /api/categories  — Créer une catégorie
// OPTIONS /api/categories  — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { authenticateRequest } from '../../lib/auth';
import { jsonOk, jsonError, corsPreflightResponse, safeJsonParse } from '../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

export const GET: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY nom').all();
  return jsonOk({ categories });
};

export const POST: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);
  if (auth.role === 'livreur') return jsonError('Accès refusé', 403);

  const parsed = await safeJsonParse<{ nom: string; couleur_affichage?: string; icone?: string }>(request);
  if (parsed.error) return parsed.error;

  const { nom, couleur_affichage, icone } = parsed.data;
  if (!nom) return jsonError('nom requis', 400);

  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO categories (nom, couleur_affichage, icone) VALUES (?, ?, ?)'
    ).run(nom, couleur_affichage ?? '#8B7355', icone ?? null);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    return jsonOk({ category }, 201);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return jsonError('Une catégorie avec ce nom existe déjà', 409);
    }
    throw e;
  }
};
