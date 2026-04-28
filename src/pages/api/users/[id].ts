// ============================================================
// GET     /api/users/[id] — Détail d'un utilisateur
// PUT     /api/users/[id] — Met à jour un utilisateur
// DELETE  /api/users/[id] — Supprime un utilisateur
// OPTIONS /api/users/[id] — Preflight CORS
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
import bcrypt from 'bcryptjs';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

export const GET: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const user = await dbGet('SELECT id, email, nom, prenom, telephone, role, active, created_at FROM profiles WHERE id = ?', [id]);
  if (!user) return jsonError('Utilisateur introuvable', 404);

  return jsonOk({ user });
};

interface UpdateUserBody {
  nom?: string;
  prenom?: string;
  telephone?: string;
  role?: string;
  active?: number;
  password?: string;
}

export const PUT: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin') {
    return jsonError('Accès refusé — rôle admin requis', 403);
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const existing = await dbGet('SELECT * FROM profiles WHERE id = ?', [id]);
  if (!existing) return jsonError('Utilisateur introuvable', 404);

  const parsed = await safeJsonParse<UpdateUserBody>(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const fields: string[] = [];
  const values: any[] = [];

  const allowed: (keyof UpdateUserBody)[] = ['nom', 'prenom', 'telephone', 'role', 'active', 'password'];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === 'password') {
        if (typeof body.password === 'string' && body.password) {
          const hash = await bcrypt.hash(body.password, 10);
          fields.push('password_hash = ?');
          values.push(hash);
        }
      } else {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }
  }

  if (fields.length === 0) return jsonError('Aucun champ à mettre à jour', 400);

  values.push(id);

  await dbRun(
    `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  const user = await dbGet('SELECT id, email, nom, prenom, telephone, role, active, created_at FROM profiles WHERE id = ?', [id]);
  return jsonOk({ user });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin') {
    return jsonError('Accès refusé — rôle admin requis', 403);
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return jsonError('ID invalide', 400);

  const existing = await dbGet('SELECT id FROM profiles WHERE id = ?', [id]);
  if (!existing) return jsonError('Utilisateur introuvable', 404);

  await dbRun('DELETE FROM profiles WHERE id = ?', [id]);
  return jsonOk({ deleted: true, id });
};
