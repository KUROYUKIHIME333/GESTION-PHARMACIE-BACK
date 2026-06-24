import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ZodError } from "zod";
import {
  prescriptionCreateSchema,
  prescriptionLineCreateSchema,
  prescriptionStatusUpdateSchema,
  prescriptionQuerySchema,
} from "./prescription.schemas.js";
import {
  listPrescriptions,
  getPrescriptionById,
  createPrescription,
  addPrescriptionLine,
  updatePrescriptionStatus,
} from "./prescription.services.js";
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
    handler: async (request, reply) => {
      try {
        const query = prescriptionQuerySchema.parse(request.query);
        const result = await listPrescriptions(query);
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
    handler: async (request, reply) => {
      try {
        const data = prescriptionCreateSchema.parse(request.body);
        const prescription = await createPrescription(data, request.user.id);
        return reply.status(201).send({ success: true, data: prescription });
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

  // GET /api/prescriptions/:id - Détail d'une ordonnance
  fastify.get("/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const prescription = await getPrescriptionById(id);
      return reply.status(200).send({ success: true, data: prescription });
    },
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
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = prescriptionLineCreateSchema.parse(request.body);
        const line = await addPrescriptionLine(id, data);
        return reply.status(201).send({ success: true, data: line });
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
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = prescriptionStatusUpdateSchema.parse(request.body);
        const prescription = await updatePrescriptionStatus(id, data);
        return reply.status(200).send({ success: true, data: prescription });
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
