import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client.js";
import { env } from "./env.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

// ─── Pool PostgreSQL (singleton) ────────────────────────────────────────────
export const pgPool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    // Options recommandées pour production
    max: 20, // max connexions simultanées
    idleTimeoutMillis: 30000, // fermer connexion inactive après 30s
    connectionTimeoutMillis: 5000, // timeout connexion 5s
  });

if (env.NODE_ENV !== "production") globalForPrisma.pgPool = pgPool;

// ─── Adaptateur PrismaPg ────────────────────────────────────────────────────
const adapter = new PrismaPg(pgPool);

// ─── PrismaClient (singleton) ───────────────────────────────────────────────
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ─── Graceful shutdown ─────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n${signal} reçu. Fermeture propre...`);
  await prisma.$disconnect();
  await pgPool.end();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default prisma;
