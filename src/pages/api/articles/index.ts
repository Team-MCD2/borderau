// ============================================================
// GET     /api/articles  — Liste des articles inventaire
// POST    /api/articles  — Créer un article
// OPTIONS /api/articles  — Preflight CORS
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

// --------------- GET /api/articles ---------------
export const GET: APIRoute = async ({ request, url }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role === 'livreur') {
    return jsonError('Accès refusé', 403);
  }

  const categorieId = url.searchParams.get('categorie_id');
  const search = url.searchParams.get('search');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const offset = Number(url.searchParams.get('offset')) || 0;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (categorieId) {
    where += ' AND a.categorie_id = ?';
    params.push(Number(categorieId));
  }
  if (search) {
    where += ' AND (a.description LIKE ? OR a.marque LIKE ? OR a.modele LIKE ? OR a.numero_article LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const countRow = await dbGet<{ total: number }>(
    `SELECT COUNT(*) as total FROM articles a ${where}`,
    params,
  );

  // Hide prix_achat & marge for vendeur (non-propriétaire)
  const selectFields = auth.role === 'vendeur'
    ? `a.id, a.numero_article, a.description, a.marque, a.modele, a.categorie_id,
       a.prix_vente, a.couleur_id, a.ref_couleur, a.code_barres, a.photo_url,
       a.quantite, a.taille, a.taille_canape, a.shopify_product_id, a.created_at,
       c.nom AS categorie_nom`
    : `a.*, c.nom AS categorie_nom`;

  params.push(limit, offset);
  const rows = await dbAll(
    `SELECT ${selectFields}
     FROM articles a
     LEFT JOIN categories c ON c.id = a.categorie_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`
  , params);

  return jsonOk({ articles: rows, total: countRow?.total ?? 0, limit, offset });
};

// --------------- POST /api/articles ---------------

interface CreateArticleBody {
  description: string;
  marque?: string;
  modele?: string;
  categorie_id?: number;
  couleur_id?: number;
  ref_couleur?: string;
  prix_achat?: number;
  prix_vente?: number;
  code_barres?: string;
  photo_url?: string;
  quantite?: number;
  taille?: string;
  taille_canape?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role === 'livreur') {
    return jsonError('Accès refusé', 403);
  }

  const parsed = await safeJsonParse<CreateArticleBody>(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;
  if (!body.description) {
    return jsonError('description requise', 400);
  }

  // Generate numero_article: DECO-YYMMDD-XXXXXX
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  const numeroArticle = `DECO-${yy}${mm}${dd}-${rand}`;

  const result = await dbRun(`
    INSERT INTO articles
      (numero_article, description, marque, modele, categorie_id,
       couleur_id, ref_couleur, prix_achat, prix_vente,
       code_barres, photo_url, quantite, taille, taille_canape)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    numeroArticle,
    body.description,
    body.marque ?? null,
    body.modele ?? null,
    body.categorie_id ?? null,
    body.couleur_id ?? null,
    body.ref_couleur ?? null,
    body.prix_achat ?? 0,
    body.prix_vente ?? 0,
    body.code_barres ?? null,
    body.photo_url ?? null,
    body.quantite ?? 0,
    body.taille ?? null,
    body.taille_canape ?? null,
  ]);

  const article = await dbGet('SELECT * FROM articles WHERE id = ?', [result.lastInsertRowid]);
  return jsonOk({ article }, 201);
};
