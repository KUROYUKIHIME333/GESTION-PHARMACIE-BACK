import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { stockController } from "./stock.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";

export async function stockRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/stock - Vue stock agrégée
  fastify.get("/", {
    preHandler: [requireAuth],
    schema: {
      tags: ["Stock"],
      summary: "Obtenir la vue d'ensemble du stock",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      drugId: { type: "string" },
                      drugName: { type: "string" },
                      totalQuantity: { type: "number" },
                      isBelowMin: { type: "boolean" },
                      isCritical: { type: "boolean" },
                      activeBatches: { type: "number" },
                      nearestExpiry: { type: "string", format: "date-time" },
                    },
                  },
                },
                summary: {
                  type: "object",
                  properties: {
                    totalDrugs: { type: "number" },
                    drugsInStock: { type: "number" },
                    drugsBelowMin: { type: "number" },
                    drugsCritical: { type: "number" },
                    totalValueCDF: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: stockController.getOverview,
  });

  // GET /api/stock/:drugId - Détail stock d'un médicament
  fastify.get("/:drugId", {
    preHandler: [requireAuth],
    schema: {
      tags: ["Stock"],
      summary: "Obtenir les détails de stock pour un médicament spécifique",
      params: {
        type: "object",
        properties: {
          drugId: { type: "string", description: "CUID du médicament" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                drug: { type: "object" }, // Structure détaillée issue de StockDetail.drug [cite: 15, 16]
                totalQuantity: { type: "number" },
                batches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      batchNumber: { type: "string" },
                      currentQuantity: { type: "number" },
                      expiryDate: { type: "string", format: "date-time" },
                      isQuarantined: { type: "boolean" },
                      daysUntilExpiry: { type: "number" },
                    },
                  },
                },
                alerts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      message: { type: "string" },
                      severity: {
                        type: "string",
                        enum: ["warning", "critical", "info"],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        404: {
          description: "Médicament non trouvé",
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
    handler: stockController.getOne,
  });
}
