import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z
    .string()
    .min(64, "JWT_SECRET doit contenir au moins 64 caractères"),
  JWT_EXPIRES_IN: z.string().default("24h"),
  COOKIE_SECRET: z.string(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000").transform(Number),
  API_URL: z.string(),
});

// Parse et valide les variables d'environnement
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(
    "❌ Variables d'environnement invalides :",
    _env.error.format()
  );
  throw new Error("Configuration invalide des variables d'environnement");
}

export const env = _env.data;
