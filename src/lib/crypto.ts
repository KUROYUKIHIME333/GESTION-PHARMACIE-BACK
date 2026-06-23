import * as argon2 from "argon2";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "./env.js";

// ─── Argon2id Configuration ───────────────────────────────────────────────
// Paramètres OWASP 2023 recommandés pour argon2id
const ARGON2_CONFIG = {
  type: argon2.argon2id, // Variante recommandée par OWASP
  memoryCost: 65536, // 64 MiB (minimum recommandé)
  timeCost: 3, // 3 itérations
  parallelism: 4, // 4 threads parallèles
  hashLength: 32, // 256 bits
} as const;

/**
 * Hash un mot de passe avec Argon2id (OWASP recommandé)
 * @param plainPassword - Mot de passe en clair
 * @returns Hash Argon2id encodé (format PHC)
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  return argon2.hash(plainPassword, ARGON2_CONFIG);
};

/**
 * Vérifie un mot de passe contre un hash Argon2id
 * @param plainPassword - Mot de passe en clair
 * @param hashedPassword - Hash stocké (format PHC : $argon2id$v=19$m=65536,t=3,p=4$...)
 * @returns true si le mot de passe correspond
 */
export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return argon2.verify(hashedPassword, plainPassword);
};

// ─── JWT Types & Configuration ──────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Signe un token JWT
 * @param payload - Données à encoder (sans iat/exp, gérés automatiquement)
 * @returns Token JWT signé
 */
export const signJwt = (payload: Omit<JwtPayload, "iat" | "exp">): string => {
  // Définir le secret explicitement
  const secret = env.JWT_SECRET;
  // Définir les options séparément pour aider TypeScript
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };
  // Appel explicite
  return jwt.sign(payload, secret, options);
};

/**
 * Vérifie et décode un token JWT
 * @param token - Token JWT à vérifier
 * @returns Payload décodé
 * @throws JsonWebTokenError si le token est invalide/expiré
 */
export const verifyJwt = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
