import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { dispensationController } from "./dispensation.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

// --- Schémas réutilisables pour Swagger ---

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
