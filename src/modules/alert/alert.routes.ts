import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { alertController } from "./alert.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "../../prisma/generated/prisma/client.js";

// Schémas réutilisables pour la doc Swagger
const alertItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    type: { type: "string" },
    status: { type: "string" },
    drugId: { type: "string" },
    drugName: { type: "string" },
    drugCode: { type: "string" },
    batchId: { type: "string", nullable: true },
    batchNumber: { type: "string", nullable: true },
    message: { type: "string" },
    threshold: { type: "number", nullable: true },
    currentValue: { type: "number", nullable: true },
    severity: { type: "string", enum: ["critical", "warning", "info"] },
    createdAt: { type: "string", format: "date-time" },
    acknowledgedAt: { type: "string", format: "date-time", nullable: true },
    acknowledgedBy: {
      type: "object",
      nullable: true,
      properties: {
        id: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
      },
    },
  },
};

export async function alertRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/alerts
  fastify.get("/", {
    schema: {
      description: "Récupérer la liste des alertes de stock",
      tags: ["Alerts"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                alerts: { type: "array", items: alertItemSchema },
                total: { type: "number" },
                page: { type: "number" },
                limit: { type: "number" },
                totalPages: { type: "number" },
                summary: {
                  type: "object",
                  properties: {
                    critical: { type: "number" },
                    warning: { type: "number" },
                    info: { type: "number" },
                    byType: {
                      type: "object",
                      additionalProperties: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth],
    handler: alertController.list,
  });

  // POST /api/alerts/:id/acknowledge
  fastify.post("/:id/acknowledge", {
    schema: {
      description: "Acquitter une alerte spécifique",
      tags: ["Alerts"],
      params: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
      body: {
        type: "object",
        properties: { status: { type: "string" }, comment: { type: "string" } },
        required: ["status"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: {
              type: "object",
              properties: {
                alert: { type: "object" }, // Structure simplifiée de l'alerte mise à jour
                acknowledgement: { type: "object" },
              },
            },
          },
        },
        400: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
        404: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
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
    handler: alertController.acknowledge,
  });
}
