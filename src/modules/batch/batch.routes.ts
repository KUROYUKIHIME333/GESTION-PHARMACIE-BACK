import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { batchController } from "./batch.controller.js";
import { requireAuth } from "../../plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

// --- Schémas réutilisables ---

const batchItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    batchNumber: { type: "string" },
    currentQuantity: { type: "number" },
    initialQuantity: { type: "number" },
    expiryDate: { type: "string", format: "date-time" },
    isQuarantined: { type: "boolean" },
    isActive: { type: "boolean" },
    drug: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        code: { type: "string" },
      },
    },
    supplier: {
      type: "object",
      nullable: true,
      properties: { id: { type: "string" }, name: { type: "string" } },
    },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", default: false },
    message: { type: "string" },
    code: { type: "string" },
    details: { type: "object", nullable: true },
  },
};

export async function batchRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/batches
  fastify.get("/", {
    schema: {
      description: "Récupérer la liste paginée des lots",
      tags: ["Batches"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                batches: { type: "array", items: batchItemSchema },
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
    handler: batchController.list,
  });

  // POST /api/batches
  fastify.post("/", {
    schema: {
      description: "Créer un nouveau lot",
      tags: ["Batches"],
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: batchItemSchema,
          },
        },
        400: errorResponseSchema,
        409: errorResponseSchema,
      },
    },
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.PHARMACY_TECH,
        UserRole.STOCK_MANAGER
      ),
    ],
    handler: batchController.create,
  });

  // GET /api/batches/:id
  fastify.get("/:id", {
    schema: {
      description: "Détail d'un lot spécifique",
      tags: ["Batches"],
      params: { type: "object", properties: { id: { type: "string" } } },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              ...batchItemSchema,
              properties: {
                ...batchItemSchema.properties,
                location: { type: "object" },
                movements: { type: "array" },
              },
            },
          },
        },
        404: errorResponseSchema,
      },
    },
    preHandler: [requireAuth],
    handler: batchController.getOne,
  });

  // PUT /api/batches/:id/quarantine
  fastify.put("/:id/quarantine", {
    schema: {
      description: "Modifier le statut de quarantaine d'un lot",
      tags: ["Batches"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: batchItemSchema,
          },
        },
        400: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.STOCK_MANAGER
      ),
    ],
    handler: batchController.quarantine,
  });
}
