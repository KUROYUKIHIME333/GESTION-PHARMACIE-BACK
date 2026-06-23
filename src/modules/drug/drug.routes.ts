import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ZodError } from "zod";
import {
  drugCreateSchema,
  drugUpdateSchema,
  drugQuerySchema,
} from "./drug.schemas.js";
import {
  listDrugs,
  getDrugById,
  createDrug,
  updateDrug,
  deleteDrug,
} from "./drug.services.js";
import { requireAuth } from "../../plugins/auth.plugins.js";
import { AppError } from "../../lib/error.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

export async function drugRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/drugs - Liste des médicaments
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      try {
        const query = drugQuerySchema.parse(request.query);
        const result = await listDrugs(query);
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
    handler: async (request, reply) => {
      try {
        const data = drugCreateSchema.parse(request.body);
        const drug = await createDrug(data, request.user.id);
        return reply.status(201).send({ success: true, data: drug });
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

  // GET /api/drugs/:id - Détail d'un médicament
  fastify.get("/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const drug = await getDrugById(id);
      return reply.status(200).send({ success: true, data: drug });
    },
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
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = drugUpdateSchema.parse(request.body);
        const drug = await updateDrug(id, data);
        return reply.status(200).send({ success: true, data: drug });
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

  // DELETE /api/drugs/:id - Supprimer un médicament
  fastify.delete("/:id", {
    preHandler: [requireAuth, fastify.requireRole(UserRole.SUPERADMIN)],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      await deleteDrug(id);
      return reply.status(200).send({
        success: true,
        message: "Médicament supprimé avec succès",
      });
    },
  });
}
