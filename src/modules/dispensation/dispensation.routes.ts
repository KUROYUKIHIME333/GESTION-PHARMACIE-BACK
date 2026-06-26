import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { dispensationController } from "./dispensation.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";
import { PaymentMethodValues } from "./dispensation.schemas.js";

// --- Schémas réutilisables pour Swagger ---
// Schéma pour une ligne de dispensation
const dispensationLineJsonSchema = {
  type: "object",
  required: ["drugId", "quantity"],
  properties: {
    prescriptionLineId: {
      type: "string",
      description: "CUID de la ligne d'ordonnance",
    },
    drugId: { type: "string", description: "CUID du médicament" },
    quantity: { type: "integer", minimum: 1 },
  },
};

// Schéma pour la création d'une dispensation
const dispensationCreateJsonSchema = {
  type: "object",
  required: ["patientId", "paymentMethod", "lines"],
  properties: {
    patientId: { type: "string" },
    prescriptionId: { type: "string" },
    paymentMethod: {
      type: "string",
      enum: PaymentMethodValues,
    },
    totalAmountCDF: { type: "number", minimum: 0 },
    totalAmountUSD: { type: "number", minimum: 0 },
    amountPaidCDF: { type: "number", minimum: 0 },
    amountPaidUSD: { type: "number", minimum: 0 },
    insuranceCoverage: { type: "number", minimum: 0 },
    receiptNumber: { type: "string", maxLength: 50 },
    lines: {
      type: "array",
      minItems: 1,
      items: dispensationLineJsonSchema,
    },
    notes: { type: "string" },
  },
};

const dispensationItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    dispensationNumber: { type: "string" },
    patient: {
      type: "object",
      properties: {
        id: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        hospitalNumber: { type: "string" },
      },
    },
    prescription: {
      type: "object",
      nullable: true,
      properties: {
        id: { type: "string" },
        prescriptionNumber: { type: "string" },
      },
    },
    dispensedBy: {
      type: "object",
      properties: {
        id: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
      },
    },
    dispensedAt: { type: "string", format: "date-time" },
    paymentMethod: { type: "string" },
    totalAmountCDF: { type: "number", nullable: true },
    totalAmountUSD: { type: "number", nullable: true },
    lineCount: { type: "number" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", default: false },
    message: { type: "string" },
    code: { type: "string" },
  },
};

export async function dispensationRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/dispensations
  fastify.get("/", {
    schema: {
      description: "Liste paginée des dispensations",
      tags: ["Dispensations"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                dispensations: { type: "array", items: dispensationItemSchema },
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
    handler: dispensationController.list,
  });

  // GET /api/dispensations/:id
  fastify.get("/:id", {
    schema: {
      description: "Détails d'une dispensation",
      tags: ["Dispensations"],
      params: { type: "object", properties: { id: { type: "string" } } },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              ...dispensationItemSchema,
              properties: {
                ...dispensationItemSchema.properties,
                lines: { type: "array" },
              },
            },
          },
        },
        404: errorResponseSchema,
      },
    },
    preHandler: [requireAuth],
    handler: dispensationController.getOne,
  });

  // POST /api/dispensations
  fastify.post("/", {
    schema: {
      description: "Créer une nouvelle dispensation",
      tags: ["Dispensations"],
      body: dispensationCreateJsonSchema,
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: dispensationItemSchema,
          },
        },
        400: errorResponseSchema,
      },
    },
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.PHARMACY_TECH,
        UserRole.NURSE
      ),
    ],
    handler: dispensationController.create,
  });
}
