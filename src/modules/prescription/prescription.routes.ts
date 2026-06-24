import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ZodError } from "zod";
import {
  prescriptionCreateSchema,
  prescriptionLineCreateSchema,
  prescriptionStatusUpdateSchema,
  prescriptionQuerySchema,
} from "./prescription.schemas.js";
import { prescriptionController } from "./prescription.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { AppError } from "@/lib/error.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

export async function prescriptionRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/prescriptions - Liste des ordonnances
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: prescriptionController.list,
  });

  // POST /api/prescriptions - Créer une ordonnance
  fastify.post("/", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR
      ),
    ],
    handler: prescriptionController.create,
  });

  // GET /api/prescriptions/:id - Détail d'une ordonnance
  fastify.get("/:id", {
    preHandler: [requireAuth],
    handler: prescriptionController.getOne,
  });

  // POST /api/prescriptions/:id/lines - Ajouter une ligne
  fastify.post("/:id/lines", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR
      ),
    ],
    handler: prescriptionController.addLine,
  });

  // PUT /api/prescriptions/:id/status - Changer le statut
  fastify.put("/:id/status", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR
      ),
    ],
    handler: prescriptionController.updateStatus,
  });
}
