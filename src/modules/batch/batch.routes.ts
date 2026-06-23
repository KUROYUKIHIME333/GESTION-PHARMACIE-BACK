import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { batchController } from "./batch.controller.js";
import { requireAuth } from "../../plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

export async function batchRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/batches - Liste des lots
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: batchController.list,
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
    handler: batchController.create,
  });

  // GET /api/batches/:id - Détail d'un lot
  fastify.get("/:id", {
    preHandler: [requireAuth],
    handler: batchController.getOne,
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
    handler: batchController.quarantine,
  });
}
