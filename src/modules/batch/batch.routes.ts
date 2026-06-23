import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ZodError } from "zod";
import {
  batchCreateSchema,
  batchQuarantineSchema,
  batchQuerySchema,
} from "./batch.schemas.js";
import {
  listBatches,
  getBatchById,
  createBatch,
  quarantineBatch,
} from "./batch.services.js";
import { requireAuth } from "../../plugins/auth.plugins.js";
import { AppError } from "../../lib/error.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

export async function batchRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/batches - Liste des lots
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      try {
        const query = batchQuerySchema.parse(request.query);
        const result = await listBatches(query);
        return reply.status(200).send({ success: true, data: result });
      } catch (error) {
        if (error instanceof ZodError) {
          throw AppError.validation("Paramètres invalides", {
            issues: error.issues,
          });
        }
        throw error;
      }
    },
  });

  // POST /api/batches - Réceptionner un lot
  fastify.post("/", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.PHARMACY_TECH,
        UserRole.STOCK_MANAGER
      ),
    ],
    handler: async (request, reply) => {
      try {
        const data = batchCreateSchema.parse(request.body);
        const batch = await createBatch(data, request.user.id);
        return reply.status(201).send({ success: true, data: batch });
      } catch (error) {
        if (error instanceof ZodError) {
          throw AppError.validation("Données invalides", {
            issues: error.issues,
          });
        }
        throw error;
      }
    },
  });

  // GET /api/batches/:id - Détail d'un lot
  fastify.get("/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const batch = await getBatchById(id);
      return reply.status(200).send({ success: true, data: batch });
    },
  });

  // PUT /api/batches/:id/quarantine - Mettre en/quitter quarantaine
  fastify.put("/:id/quarantine", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.STOCK_MANAGER
      ),
    ],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = batchQuarantineSchema.parse(request.body);
        const batch = await quarantineBatch(id, data, request.user.id);
        return reply.status(200).send({
          success: true,
          data: batch,
          message: data.isQuarantined
            ? "Lot mis en quarantaine"
            : "Lot retiré de la quarantaine",
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw AppError.validation("Données invalides", {
            issues: error.issues,
          });
        }
        throw error;
      }
    },
  });
}
