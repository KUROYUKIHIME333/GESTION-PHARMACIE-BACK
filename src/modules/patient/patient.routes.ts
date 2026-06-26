import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { patientController } from "./patient.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";
import { AllergySeverityValues, GenderValues } from "./patient.schemas.js";

// --- Schémas JSON pour Swagger ---
// Schéma de création d'un patient
export const patientCreateSchema = {
  type: "object",
  required: ["hospitalNumber", "firstName", "lastName"],
  properties: {
    hospitalNumber: { type: "string", maxLength: 50 },
    firstName: { type: "string", maxLength: 100 },
    lastName: { type: "string", maxLength: 100 },
    dateOfBirth: { type: "string", format: "date-time" },
    gender: { type: "string", enum: GenderValues },
    nationalId: { type: "string", maxLength: 50 },
    phone: { type: "string", maxLength: 20 },
    address: { type: "string" },
    commune: { type: "string", maxLength: 100 },
    territoire: { type: "string", maxLength: 100 },
    province: { type: "string", maxLength: 100 },
    insuranceId: { type: "string" },
    ongCoverageRef: { type: "string", maxLength: 100 },
    isHivPatient: { type: "boolean" },
    arvCode: { type: "string", maxLength: 50 },
    isTbPatient: { type: "boolean" },
    tbCode: { type: "string", maxLength: 50 },
    chronicConditions: { type: "array", items: { type: "string" } },
    isActive: { type: "boolean" },
    notes: { type: "string" },
  },
};

// Schéma de mise à jour (tous les champs optionnels)
export const patientUpdateSchema = {
  ...patientCreateSchema,
  required: [], // Aucun champ requis pour une mise à jour partielle
};

// Schéma pour les allergie
export const allergyCreateSchema = {
  type: "object",
  required: ["substance", "severity"],
  properties: {
    substance: { type: "string", maxLength: 255 },
    reaction: { type: "string" },
    severity: { type: "string", enum: AllergySeverityValues },
    confirmedAt: { type: "string", format: "date-time" },
    confirmedBy: { type: "string", maxLength: 100 },
    notes: { type: "string" },
  },
};

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

  // GET /api/patients/:id
  fastify.get("/:id", {
    schema: {
      description: "Données d'un patients",
      tags: ["Patients"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: patientItemSchema,
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
      body: patientCreateSchema,
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

  // PUT /api/patients
  fastify.put("/:id", {
    schema: {
      description: "Modifier un patient existant",
      tags: ["Patients"],
      body: patientUpdateSchema,
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
      body: allergyCreateSchema,
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
