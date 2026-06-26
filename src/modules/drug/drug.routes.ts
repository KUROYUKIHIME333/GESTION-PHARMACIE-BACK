import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { drugController } from "./drug.controller.js";
import { requireAuth } from "../../plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

// --- Schémas réutilisables ---

const drugItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    code: { type: "string" },
    name: { type: "string" },
    genericName: { type: "string", nullable: true },
    dci: { type: "string" },
    form: { type: "string" },
    category: { type: "string" },
    isEssential: { type: "boolean" },
    isControlled: { type: "boolean" },
    unitPriceCDF: { type: "number", nullable: true },
    unitPriceUSD: { type: "number", nullable: true },
    minStockLevel: { type: "number" },
    criticalStockLevel: { type: "number" },
    isActive: { type: "boolean" },
    _count: {
      type: "object",
      properties: { batches: { type: "number" } },
    },
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

export async function drugRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/drugs
  fastify.get("/", {
    schema: {
      description: "Liste paginée des médicaments",
      tags: ["Drugs"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                drugs: { type: "array", items: drugItemSchema },
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
    handler: drugController.list,
  });

  // POST /api/drugs
  fastify.post("/", {
    schema: {
      description: "Créer un nouveau médicament",
      tags: ["Drugs"],
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: drugItemSchema,
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
        UserRole.STOCK_MANAGER
      ),
    ],
    handler: drugController.create,
  });

  // GET /api/drugs/:id
  fastify.get("/:id", {
    schema: {
      description: "Détails d'un médicament",
      tags: ["Drugs"],
      params: { type: "object", properties: { id: { type: "string" } } },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: drugItemSchema,
          },
        },
        404: errorResponseSchema,
      },
    },
    preHandler: [requireAuth],
    handler: drugController.getOne,
  });

  // PUT /api/drugs/:id
  fastify.put("/:id", {
    schema: {
      description: "Modifier un médicament",
      tags: ["Drugs"],
      params: { type: "object", properties: { id: { type: "string" } } },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: drugItemSchema,
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
    handler: drugController.update,
  });
}
