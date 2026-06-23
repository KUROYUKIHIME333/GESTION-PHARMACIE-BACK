import fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";
import { authenticate } from "./plugins/auth.plugins.js";
import { rbac } from "./plugins/rbac.plugins.js";
import { authRoutes } from "@/modules/auth/auth.routes.js";
import { AppError } from "./lib/error.js";
import { ZodError } from "zod";

const app = fastify({
  logger: {
    level: env.NODE_ENV === "development" ? "debug" : "info",
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

// ─── Plugins ─────────────────────────────────────────────────────────────────
await app.register(cors, {
  origin: env.NODE_ENV === "development" ? true : env.API_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await app.register(authenticate);
await app.register(rbac);

// ─── Routes ──────────────────────────────────────────────────────────────────
await app.register(authRoutes, { prefix: "/api/auth" });

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// ─── Gestion des erreurs ─────────────────────────────────────────────────────
app.setErrorHandler((error, _request, reply) => {
  // Erreurs Zod (validation)
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Données invalides",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  // Erreurs métier personnalisées
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof import("@/lib/errors.js").ValidationError &&
        error.details
          ? { details: error.details }
          : {}),
      },
    });
  }

  // Erreur Fastify de validation (schéma route)
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Données invalides",
        details: error.validation,
      },
    });
  }

  // Erreur JWT
  if (
    error.name === "JsonWebTokenError" ||
    error.name === "TokenExpiredError"
  ) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Token invalide ou expiré",
      },
    });
  }

  // Erreur inconnue - ne pas exposer en production
  app.log.error(error);

  return reply.status(500).send({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "development"
          ? error.message
          : "Une erreur interne est survenue",
    },
  });
});

// ─── Démarrage ───────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  try {
    const port = parseInt(env.PORT, 10);
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`🚀 Serveur démarré sur http://0.0.0.0:${port}`);
    app.log.info(`📊 Environnement : ${env.NODE_ENV}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
