// ============================================================
// GET     /api/users       — Liste des utilisateurs (admin only)
// POST    /api/users       — Crée un utilisateur (admin only)
// OPTIONS /api/users       — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { authenticateRequest, getAllUsers, createUser, findUserById } from '../../lib/auth';
import { jsonOk, jsonError, corsPreflightResponse, safeJsonParse } from '../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

export const GET: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin' && auth.role !== 'vendeur_proprietaire') {
    return jsonError('Accès refusé — rôle admin ou propriétaire requis', 403);
  }

  const users = await getAllUsers();
  return jsonOk({ users });
};

interface CreateUserBody {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role: string;
}

export const POST: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth) return jsonError('Non authentifié', 401);

  if (auth.role !== 'admin') {
    return jsonError('Accès refusé — rôle admin requis', 403);
  }

  const parsed = await safeJsonParse<CreateUserBody>(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;

  if (!body.email || !body.password || !body.nom || !body.prenom || !body.role) {
    return jsonError('Champs requis: email, password, nom, prenom, role', 400);
  }

  const validRoles = ['admin', 'vendeur', 'vendeur_proprietaire', 'livreur'];
  if (!validRoles.includes(body.role)) {
    return jsonError(`Rôle invalide. Valeurs: ${validRoles.join(', ')}`, 400);
  }

  try {
    const user = await createUser(body.email, body.password, body.prenom, body.nom, body.role);
    return jsonOk({ user }, 201);
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur création utilisateur', 400);
  }
};
