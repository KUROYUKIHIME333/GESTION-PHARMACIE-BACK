import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { patientController } from "./patient.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

// --- Schémas JSON pour Swagger ---

const patientItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    hospitalNumber: { type: "string" },
    firstName: { type: "string" },
    lastName: { type: "string" },
    dateOfBirth: { type: "string", format: "date-time", nullable: true },
    gender: { type: "string" },
    phone: { type: "string", nullable: true },
    isActive: { type: "boolean" },
    _count: {
      type: "object",
      properties: {
        prescriptions: { type: "number" },
        dispensations: { type: "number" },
      },
    },
  },
};

const allergyItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    substance: { type: "string" },
    reaction: { type: "string", nullable: true },
    severity: { type: "string" },
    confirmedAt: { type: "string", format: "date-time" },
    notes: { type: "string", nullable: true },
  },
};

const errorResponse = {
  type: "object",
  properties: {
    success: { type: "boolean", default: false },
    message: { type: "string" },
    code: { type: "string" },
  },
};

export async function patientRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/patients
  fastify.get("/", {
    schema: {
      description: "Liste paginée des patients",
      tags: ["Patients"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                patients: { type: "array", items: patientItemSchema },
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
    preHandler: [requireAuth],
    handler: patientController.list,
  });

  // POST /api/patients
  fastify.post("/", {
    schema: {
      description: "Créer un nouveau patient",
      tags: ["Patients"],
      // Note: Vous pouvez ajouter ici votre patientCreateSchema en 'body'
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: patientItemSchema,
          },
        },
        400: errorResponse,
        409: errorResponse,
      },
    },
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR,
        UserRole.NURSE
      ),
    ],
    handler: patientController.create,
  });

  // GET /api/patients/:id/allergies
  fastify.get("/:id/allergies", {
    schema: {
      description: "Liste des allergies d'un patient",
      tags: ["Patients"],
      params: { type: "object", properties: { id: { type: "string" } } },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "array", items: allergyItemSchema },
          },
        },
      },
    },
    preHandler: [requireAuth],
    handler: patientController.listAllergies,
  });

  // POST /api/patients/:id/allergies
  fastify.post("/:id/allergies", {
    schema: {
      description: "Ajouter une allergie à un patient",
      tags: ["Patients"],
      params: { type: "object", properties: { id: { type: "string" } } },
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: allergyItemSchema,
          },
        },
        400: errorResponse,
        404: errorResponse,
      },
    },
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR
      ),
    ],
    handler: patientController.addAllergy,
  });
}
