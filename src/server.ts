import "dotenv/config";
import fastify, { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "./lib/env.js";
import { authenticate } from "./plugins/auth.plugins.js";
import { rbac } from "./plugins/rbac.plugins.js";
import { authRoutes } from "@/modules/auth/auth.routes.js";
import { drugRoutes } from "@/modules/drug/drug.routes.js";
import { batchRoutes } from "@/modules/batch/batch.routes.js";
import { stockRoutes } from "@/modules/stock/stock.routes.js";
import { patientRoutes } from "@/modules/patient/patient.routes.js";
import { prescriptionRoutes } from "@/modules/prescription/prescription.routes.js";
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

// ─── Plugins & Swagger ───────────────────────────────────────────────────────
await app.register(cors, {
  origin: env.NODE_ENV === "development" ? true : env.API_URL,
  credentials: true,
});

await app.register(swagger, {
  openapi: {
    info: { title: "API Documentation", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
});
await app.register(swaggerUi, { routePrefix: "/docs" });

await app.register(authenticate);
await app.register(rbac);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(drugRoutes, { prefix: "/api/drugs" });
await app.register(batchRoutes, { prefix: "/api/batches" });
await app.register(stockRoutes, { prefix: "/api/stock" });
await app.register(patientRoutes, { prefix: "/api/patients" });
await app.register(prescriptionRoutes, { prefix: "/api/prescriptions" });

// ─── Gestion des erreurs (Type-Safe) ─────────────────────────────────────────
app.setErrorHandler(
  (error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    // 1. Erreur métier personnalisée (AppError)
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    // 2. Erreur Zod (Validation)
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Données invalides",
          details: error.issues,
        },
      });
    }

    // Cast sécurisé pour accéder aux propriétés communes des erreurs
    const err = error as any;

    // 3. Erreur JWT
    if (
      err?.name === "JsonWebTokenError" ||
      err?.name === "TokenExpiredError"
    ) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Token invalide ou expiré" },
      });
    }

    // 4. Erreur Fastify de validation (schema)
    if (err?.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Données invalides",
          details: err.validation,
        },
      });
    }

    // 5. Erreur inconnue
    app.log.error(error);

    const isDev = env.NODE_ENV === "development";
    return reply.status(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          isDev && error instanceof Error
            ? error.message
            : "Une erreur interne est survenue",
      },
    });
  }
);

// ─── Démarrage ───────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // Conversion explicite du port en nombre si nécessaire
    const port =
      typeof env.PORT === "string" ? parseInt(env.PORT, 10) : env.PORT;
    app.log.info("|====================================================|");
    app.log.info("|====================================================|");
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`Serveur : http://0.0.0.0:${port}`);
    app.log.info(`📖 Docs : http://0.0.0.0:${port}/docs`);
    app.log.info("|====================================================|");
    app.log.info("|====================================================|");
    console.log("📋 Routes enregistrées:");
    console.log(app.printRoutes());
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
