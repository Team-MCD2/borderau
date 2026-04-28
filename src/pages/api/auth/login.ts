// ============================================================
// POST    /api/auth/login  — Connexion utilisateur
// OPTIONS /api/auth/login  — Preflight CORS
// ============================================================
import type { APIRoute } from 'astro';
import { findUserByEmail, verifyPassword, generateToken, toSafeUser } from '../../../lib/auth';
import { jsonOk, jsonError, corsPreflightResponse, safeJsonParse } from '../../../lib/api-helpers';

export const OPTIONS: APIRoute = () => corsPreflightResponse();

interface LoginBody {
  email: string;
  password: string;
}

export const POST: APIRoute = async ({ request }) => {
  const parsed = await safeJsonParse<LoginBody>(request);
  if (parsed.error) return parsed.error;

  const { email, password } = parsed.data;

  if (!email || !password) {
    return jsonError('Email et mot de passe requis', 400);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return jsonError('Email ou mot de passe incorrect', 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return jsonError('Email ou mot de passe incorrect', 401);
  }

  const token = generateToken(user);

  return jsonOk({
    token,
    user: toSafeUser(user),
  });
};
