import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { prescriptionController } from "./prescription.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";
import {
  prescriptionCreateSchema,
  prescriptionLineCreateSchema,
  prescriptionStatusUpdateSchema,
} from "./prescription.schemas.js";

export async function prescriptionRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/prescriptions - Liste des ordonnances
  fastify.get("/", {
    preHandler: [requireAuth],
    schema: {
      tags: ["Prescriptions"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                prescriptions: { type: "array", items: { type: "object" } }, // Structure détaillée basée sur PrescriptionListResult
                total: { type: "number" },
                page: { type: "number" },
                limit: { type: "number" },
                totalPages: { type: "number" },
              },
            },
          },
        },
      },
    },
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
    schema: {
      tags: ["Prescriptions"],
      body: prescriptionCreateSchema,
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" }, // Retourne l'objet Prescription complet
          },
        },
      },
    },
    handler: prescriptionController.create,
  });

  // GET /api/prescriptions/:id - Détail d'une ordonnance
  fastify.get("/:id", {
    preHandler: [requireAuth],
    schema: {
      tags: ["Prescriptions"],
      params: { type: "object", properties: { id: { type: "string" } } },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                patient: { type: "object" },
                lines: { type: "array" }, // Inclut les détails des médicaments
                dispensations: { type: "array" },
              },
            },
          },
        },
      },
    },
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
    schema: {
      tags: ["Prescriptions"],
      params: { type: "object", properties: { id: { type: "string" } } },
      body: prescriptionLineCreateSchema,
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" }, // Retourne l'objet PrescriptionLine créé
          },
        },
      },
    },
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
    schema: {
      tags: ["Prescriptions"],
      params: { type: "object", properties: { id: { type: "string" } } },
      body: prescriptionStatusUpdateSchema,
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" }, // Retourne l'objet Prescription mis à jour
          },
        },
      },
    },
    handler: prescriptionController.updateStatus,
  });
}
