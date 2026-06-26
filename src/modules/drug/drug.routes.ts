import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { drugController } from "./drug.controller.js";
import { requireAuth } from "../../plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";
import {
  DrugFormValues,
  DrugCategoryValues,
  StorageConditionValues,
} from "./drug.schemas.js";

// --- Schémas réutilisables ---

export const drugCreateJsonSchema = {
  type: "object",
  required: [
    "code",
    "name",
    "dci",
    "form",
    "category",
    "dosage",
    "unitOfDispense",
  ],
  properties: {
    code: { type: "string", maxLength: 50 },
    name: { type: "string", maxLength: 255 },
    genericName: { type: "string", maxLength: 255 },
    dci: { type: "string", maxLength: 255 },
    form: {
      type: "string",
      enum: DrugFormValues, // À mettre à jour selon DrugForm
    },
    category: {
      type: "string",
      enum: DrugCategoryValues, // À mettre à jour selon DrugCategory
    },
    therapeuticClass: { type: "string", maxLength: 255 },
    dosage: { type: "string", maxLength: 100 },
    concentration: { type: "string", maxLength: 100 },
    unitOfDispense: { type: "string", maxLength: 50 },
    packSize: { type: "integer", minimum: 1, default: 1 },
    packUnit: { type: "string", maxLength: 50, default: "boîte" },
    ammNumber: { type: "string", maxLength: 100 },
    isEssential: { type: "boolean", default: false },
    isControlled: { type: "boolean", default: false },
    controlledSchedule: { type: "string", maxLength: 10 },
    isProgramDrug: { type: "boolean", default: false },
    programName: { type: "string", maxLength: 100 },
    storageConditions: {
      type: "array",
      items: { type: "string", enum: StorageConditionValues }, // À mettre à jour selon StorageCondition
    },
    requiresColdChain: { type: "boolean", default: false },
    minTemp: { type: "number" },
    maxTemp: { type: "number" },
    unitPriceCDF: { type: "number", minimum: 0 },
    unitPriceUSD: { type: "number", minimum: 0 },
    isPriceRegulated: { type: "boolean", default: false },
    minStockLevel: { type: "integer", minimum: 0, default: 0 },
    criticalStockLevel: { type: "integer", minimum: 0, default: 0 },
    reorderPoint: { type: "integer", minimum: 0, default: 0 },
    reorderQuantity: { type: "integer", minimum: 0, default: 0 },
    isActive: { type: "boolean", default: true },
    notes: { type: "string" },
  },
};

export const drugUpdateJsonSchema = {
  ...drugCreateJsonSchema,
  required: [],
};

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
      body: drugCreateJsonSchema,
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
      body: drugUpdateJsonSchema,
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
