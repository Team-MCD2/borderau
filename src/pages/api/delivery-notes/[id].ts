// ============================================================
// GET     /api/delivery-notes/[id] — Détail d'un BL
// PUT     /api/delivery-notes/[id] — Met à jour un BL
// DELETE  /api/delivery-notes/[id] — Supprime un BL
// OPTIONS /api/delivery-notes/[id] — Preflight CORS
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

async function getNote(id: number) {
  const note = await dbGet<Record<string, unknown>>(
    `SELECT bl.*,
            c.nom AS client_nom, c.prenom AS client_prenom,
            c.email AS client_email, c.telephone AS client_telephone, c.adresse AS client_adresse,
            p_vendeur.prenom || ' ' || p_vendeur.nom AS vendeur_name,
            p_livreur.prenom || ' ' || p_livreur.nom AS livreur_name
     FROM bons_livraison bl
     LEFT JOIN clients c ON c.id = bl.client_id
     LEFT JOIN profiles p_vendeur ON p_vendeur.id = bl.vendeur_id
     LEFT JOIN profiles p_livreur ON p_livreur.id = bl.livreur_id
     WHERE bl.id = ?`,
    [id],
  );
  if (!note) return null;

  const items = await dbAll('SELECT * FROM lignes_bl WHERE bl_id = ?', [id]);
  return { ...note, items };
}

// --------------- GET ---------------
export const GET: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const note = await getNote(id);
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

  const existing = await dbGet('SELECT * FROM bons_livraison WHERE id = ?', [id]);
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

  await dbRun(
    `UPDATE bons_livraison SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  const note = await getNote(id);
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

  const existing = await dbGet('SELECT id FROM bons_livraison WHERE id = ?', [id]);
  if (!existing) return jsonError('Bon de livraison introuvable', 404);

  await dbRun('DELETE FROM bons_livraison WHERE id = ?', [id]);
  return jsonOk({ deleted: true, id });
};
