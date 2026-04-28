// ============================================================
// GET     /api/delivery-notes      — Liste tous les BL
// POST    /api/delivery-notes      — Crée un nouveau BL
// OPTIONS /api/delivery-notes      — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { dbAll, dbGet, dbRun, generateBlNumberAsync } from '../../../lib/db';
import { authenticateRequest } from '../../../lib/auth';
import {
  jsonOk,
  jsonError,
  corsPreflightResponse,
  safeJsonParse,
} from '../../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

// --------------- GET /api/delivery-notes ---------------
export const GET: APIRoute = async ({ request, url }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  const statut = url.searchParams.get('statut');
  const livreurId = url.searchParams.get('livreur_id');
  const search = url.searchParams.get('search');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const offset = Number(url.searchParams.get('offset')) || 0;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (statut && statut !== 'all') {
    where += ' AND bl.statut = ?';
    params.push(statut);
  }

  if (livreurId) {
    where += ' AND bl.livreur_id = ?';
    params.push(Number(livreurId));
  }

  // Livreur ne voit que ses propres BL
  if (auth.role === 'livreur') {
    where += ' AND bl.livreur_id = ?';
    params.push(auth.userId);
  }

  if (search) {
    where += ' AND (bl.numero_bl LIKE ? OR c.nom LIKE ? OR c.email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const countRow = await dbGet<{ total: number }>(
    `SELECT COUNT(*) as total FROM bons_livraison bl LEFT JOIN clients c ON c.id = bl.client_id ${where}`,
    params,
  );

  params.push(limit, offset);
  const rows = await dbAll<Record<string, any>>(
    `SELECT bl.*,
            c.nom AS client_nom, c.prenom AS client_prenom,
            c.email AS client_email, c.telephone AS client_telephone, c.adresse AS client_adresse,
            p_vendeur.prenom || ' ' || p_vendeur.nom AS vendeur_name,
            p_livreur.prenom || ' ' || p_livreur.nom AS livreur_name
     FROM bons_livraison bl
     LEFT JOIN clients c ON c.id = bl.client_id
     LEFT JOIN profiles p_vendeur ON p_vendeur.id = bl.vendeur_id
     LEFT JOIN profiles p_livreur ON p_livreur.id = bl.livreur_id
     ${where}
     ORDER BY bl.date_creation DESC
     LIMIT ? OFFSET ?`
  , params);

  const notes = [] as any[];
  for (const row of rows) {
    const items = await dbAll('SELECT * FROM lignes_bl WHERE bl_id = ?', [row.id]);
    notes.push({ ...row, items });
  }

  return jsonOk({ delivery_notes: notes, total: countRow?.total ?? 0, limit, offset });
};

// --------------- POST /api/delivery-notes ---------------

interface CreateBlBody {
  client_nom: string;
  client_prenom?: string;
  client_email?: string;
  client_telephone?: string;
  client_adresse?: string;
  commande_id?: number;
  mode_livraison?: 'domicile' | 'retrait_magasin';
  livreur_id?: number;
  items: {
    article_id?: number;
    designation: string;
    quantite: number;
    prix_unitaire: number;
  }[];
}

export const POST: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  // Livreur ne peut pas créer de BL
  if (auth.role === 'livreur') {
    return jsonError('Accès refusé — rôle vendeur ou admin requis', 403);
  }

  const parsed = await safeJsonParse<CreateBlBody>(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;

  if (!body.client_nom) {
    return jsonError('client_nom requis', 400);
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return jsonError('Au moins un article (items[]) requis', 400);
  }

  // Créer ou trouver le client
  let clientId: number;
  const existingClient = body.client_email
    ? await dbGet<{ id: number }>('SELECT id FROM clients WHERE email = ?', [body.client_email])
    : undefined;

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const clientResult = await dbRun(
      'INSERT INTO clients (nom, prenom, email, telephone, adresse) VALUES (?, ?, ?, ?, ?)',
      [
        body.client_nom,
        body.client_prenom ?? '',
        body.client_email ?? '',
        body.client_telephone ?? '',
        body.client_adresse ?? '',
      ],
    );
    clientId = Number(clientResult.lastInsertRowid);
  }

  const blNumber = await generateBlNumberAsync();
  const totalTtc = body.items.reduce((sum, it) => sum + it.quantite * it.prix_unitaire, 0);

  const result = await dbRun(`
    INSERT INTO bons_livraison
      (numero_bl, commande_id, vendeur_id, livreur_id, client_id,
       statut, mode_livraison, montant_total_ttc)
    VALUES (?, ?, ?, ?, ?, 'cree', ?, ?)
  `, [
    blNumber,
    body.commande_id ?? null,
    auth.userId,
    body.livreur_id ?? null,
    clientId,
    body.mode_livraison ?? 'domicile',
    totalTtc,
  ]);

  const noteId = result.lastInsertRowid;

  // Insert lignes
  for (const it of body.items) {
    await dbRun(
      `INSERT INTO lignes_bl (bl_id, article_id, designation, quantite, prix_unitaire)
       VALUES (?, ?, ?, ?, ?)`,
      [noteId, it.article_id ?? null, it.designation, it.quantite, it.prix_unitaire],
    );
  }

  // Return created BL
  const note = await dbGet<Record<string, unknown>>('SELECT * FROM bons_livraison WHERE id = ?', [noteId]);
  const items = await dbAll('SELECT * FROM lignes_bl WHERE bl_id = ?', [noteId]);

  return jsonOk({ delivery_note: { ...note, items } }, 201);
};
