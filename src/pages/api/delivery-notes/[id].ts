// ============================================================
// GET     /api/delivery-notes/[id] — Détail d'un BL
// PUT     /api/delivery-notes/[id] — Met à jour un BL
// DELETE  /api/delivery-notes/[id] — Supprime un BL
// OPTIONS /api/delivery-notes/[id] — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { authenticateRequest } from '../../../lib/auth';
import {
  jsonOk,
  jsonError,
  corsPreflightResponse,
  safeJsonParse,
} from '../../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

function getNote(id: number) {
  const db = getDb();
  const note = db.prepare(
    `SELECT bl.*,
            c.nom AS client_nom, c.prenom AS client_prenom,
            c.email AS client_email, c.telephone AS client_telephone, c.adresse AS client_adresse,
            p_vendeur.prenom || ' ' || p_vendeur.nom AS vendeur_name,
            p_livreur.prenom || ' ' || p_livreur.nom AS livreur_name
     FROM bons_livraison bl
     LEFT JOIN clients c ON c.id = bl.client_id
     LEFT JOIN profiles p_vendeur ON p_vendeur.id = bl.vendeur_id
     LEFT JOIN profiles p_livreur ON p_livreur.id = bl.livreur_id
     WHERE bl.id = ?`
  ).get(id) as Record<string, unknown> | undefined;
  if (!note) return null;

  const items = db.prepare(
    'SELECT * FROM lignes_bl WHERE bl_id = ?'
  ).all(id);

  return { ...note, items };
}

// --------------- GET ---------------
export const GET: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const note = getNote(id);
  if (!note) return jsonError('Bon de livraison introuvable', 404);

  return jsonOk({ delivery_note: note });
};

// --------------- PUT ---------------

interface UpdateBlBody {
  statut?: string;
  mode_livraison?: string;
  livreur_id?: number | null;
  date_livraison?: string;
  pdf_url?: string;
}

const VALID_STATUSES = ['cree', 'confirme', 'en_livraison', 'livre', 'signe'];

export const PUT: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const db = getDb();
  const existing = db.prepare('SELECT * FROM bons_livraison WHERE id = ?').get(id);
  if (!existing) return jsonError('Bon de livraison introuvable', 404);

  const parsed = await safeJsonParse<UpdateBlBody>(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  if (body.statut && !VALID_STATUSES.includes(body.statut)) {
    return jsonError(`Statut invalide. Valeurs : ${VALID_STATUSES.join(', ')}`, 400);
  }

  const fields: string[] = [];
  const values: any[] = [];

  const allowed: (keyof UpdateBlBody)[] = [
    'statut', 'mode_livraison', 'livreur_id', 'date_livraison', 'pdf_url',
  ];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (fields.length === 0) return jsonError('Aucun champ à mettre à jour', 400);

  values.push(id);

  db.prepare(
    `UPDATE bons_livraison SET ${fields.join(', ')} WHERE id = ?`
  ).run(...values);

  const note = getNote(id);
  return jsonOk({ delivery_note: note });
};

// --------------- DELETE ---------------
export const DELETE: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin') {
    return jsonError('Accès refusé — rôle admin requis', 403);
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const db = getDb();
  const existing = db.prepare('SELECT id FROM bons_livraison WHERE id = ?').get(id);
  if (!existing) return jsonError('Bon de livraison introuvable', 404);

  db.prepare('DELETE FROM bons_livraison WHERE id = ?').run(id);
  return jsonOk({ deleted: true, id });
};
