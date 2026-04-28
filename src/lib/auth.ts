// ============================================================
// src/lib/auth.ts — Authentication helpers (bcrypt + JWT)
// ============================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbAll, dbGet, dbRun } from './db';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'decoshop-dev-secret-change-me';
const JWT_EXPIRES_IN = '24h';

// --------------- Types ---------------

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: 'admin' | 'vendeur' | 'vendeur_proprietaire' | 'livreur';
  active: number;
  created_at: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export interface SafeUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: string;
  created_at: string;
}

// --------------- Helpers ---------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateToken(user: UserRow): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function toSafeUser(user: UserRow): SafeUser {
  return {
    id: user.id,
    email: user.email,
    nom: user.nom,
    prenom: user.prenom,
    telephone: user.telephone,
    role: user.role,
    created_at: user.created_at,
  };
}

// --------------- DB Queries ---------------

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return dbGet<UserRow>('SELECT * FROM profiles WHERE email = ? AND active = 1', [email]);
}

export async function findUserById(id: number): Promise<UserRow | undefined> {
  return dbGet<UserRow>('SELECT * FROM profiles WHERE id = ? AND active = 1', [id]);
}

export async function getAllUsers(): Promise<SafeUser[]> {
  const rows = await dbAll<UserRow>('SELECT * FROM profiles ORDER BY created_at DESC');
  return rows.map(toSafeUser);
}

export async function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: string,
): Promise<SafeUser> {
  const hash = await hashPassword(password);
  const result = await dbRun(
    `INSERT INTO profiles (email, password_hash, nom, prenom, role)
     VALUES (?, ?, ?, ?, ?)`,
    [email, hash, lastName, firstName, role],
  );

  const user = await dbGet<UserRow>('SELECT * FROM profiles WHERE id = ?', [result.lastInsertRowid]);
  if (!user) {
    throw new Error('Utilisateur créé mais introuvable');
  }
  return toSafeUser(user);
}

// --------------- Request auth extraction ---------------

export function extractToken(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookies = request.headers.get('Cookie') ?? '';
  const match = cookies.match(/decoshop_token=([^;]+)/);
  return match ? match[1] : null;
}

export function authenticateRequest(request: Request): JwtPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}
