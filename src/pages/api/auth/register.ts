// ============================================================
// POST    /api/auth/register — Créer un utilisateur (admin only)
// OPTIONS /api/auth/register — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { authenticateRequest, findUserByEmail, createUser } from '../../../lib/auth';
import { jsonOk, jsonError, corsPreflightResponse, safeJsonParse } from '../../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

interface RegisterBody {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role: string;
}

const VALID_ROLES = ['admin', 'vendeur', 'vendeur_proprietaire', 'livreur'];

export const POST: APIRoute = async ({ request }) => {
  const auth = authenticateRequest(request);
  if (!auth || auth.role !== 'admin') {
    return jsonError('Accès refusé — rôle admin requis', 403);
  }

  const parsed = await safeJsonParse<RegisterBody>(request);
  if (parsed.error) return parsed.error;

  const { email, password, nom, prenom, role } = parsed.data;

  if (!email || !password || !nom || !prenom) {
    return jsonError('Tous les champs sont requis (email, password, nom, prenom)', 400);
  }

  if (!VALID_ROLES.includes(role)) {
    return jsonError(`Rôle invalide. Valeurs possibles : ${VALID_ROLES.join(', ')}`, 400);
  }

  const existing = findUserByEmail(email);
  if (existing) {
    return jsonError('Un utilisateur avec cet email existe déjà', 409);
  }

  const user = await createUser(email, password, prenom, nom, role);
  return jsonOk({ user }, 201);
};
