import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ZodError } from "zod";
import {
  drugCreateSchema,
  drugUpdateSchema,
  drugQuerySchema,
} from "./drug.schemas.js";
import { drugController } from "./drug.controller.js";
import { requireAuth } from "../../plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

export async function drugRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/drugs - Liste des médicaments
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: drugController.list,
  });

  // POST /api/drugs - Créer un médicament
  fastify.post("/", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.STOCK_MANAGER
      ),
    ],
    handler: drugController.create,
  });

  // GET /api/drugs/:id - Détail d'un médicament
  fastify.get("/:id", {
    preHandler: [requireAuth],
    handler: drugController.getOne,
  });

  // PUT /api/drugs/:id - Modifier un médicament
  fastify.put("/:id", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.STOCK_MANAGER
      ),
    ],
    handler: drugController.update,
  });

  // DELETE /api/drugs/:id - Supprimer un médicament
  fastify.delete("/:id", {
    preHandler: [requireAuth, fastify.requireRole(UserRole.SUPERADMIN)],
    handler: drugController.delete,
  });
}
