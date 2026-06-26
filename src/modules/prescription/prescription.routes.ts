import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { prescriptionController } from "./prescription.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

const prescriptionCreateSchema = {
  type: "object",
  required: ["patientId"],
  properties: {
    patientId: { type: "string", description: "CUID du patient" },
    prescribedById: { type: "string", description: "CUID du prescripteur" },
    serviceId: { type: "string", description: "CUID du service" },
    isInpatient: { type: "boolean", default: false },
    admissionRef: { type: "string", maxLength: 100 },
    diagnosisCode: { type: "string", maxLength: 50 },
    diagnosisLabel: { type: "string", maxLength: 255 },
    notes: { type: "string" },
  },
};

const prescriptionStatusUpdateSchema = {
  type: "object",
  required: ["status"],
  properties: {
    status: {
      type: "string",
      enum: [
        "DRAFT",
        "PENDING",
        "PARTIALLY_DISPENSED",
        "DISPENSED",
        "CANCELLED",
        "EXPIRED",
      ],
    },
  },
};

const prescriptionLineCreateSchema = {
  type: "object",
  required: ["drugId", "quantityPrescribed", "dosage"],
  properties: {
    drugId: { type: "string" },
    quantityPrescribed: { type: "integer", minimum: 1 },
    dosage: { type: "string", minLength: 1, maxLength: 500 },
    frequency: { type: "string", maxLength: 100 },
    durationDays: { type: "integer", minimum: 1 },
    route: { type: "string", maxLength: 50 },
    instructions: { type: "string" },
  },
};

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
