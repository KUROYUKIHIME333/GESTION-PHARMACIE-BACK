import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { dashboardController } from "./dashboard.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";

// Définition du schéma de réponse détaillé pour Swagger
const dashboardStatsResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    data: {
      type: "object",
      properties: {
        alerts: {
          type: "object",
          properties: {
            totalActive: { type: "number" },
            critical: { type: "number" },
            warning: { type: "number" },
            byType: {
              type: "object",
              additionalProperties: { type: "number" },
            },
          },
        },
        stock: {
          type: "object",
          properties: {
            totalDrugs: { type: "number" },
            drugsInStock: { type: "number" },
            drugsCritical: { type: "number" },
            drugsLow: { type: "number" },
            totalValueCDF: { type: "number" },
            totalValueUSD: { type: "number" },
          },
        },
        expiries: {
          type: "object",
          properties: {
            expired: { type: "number" },
            critical30Days: { type: "number" },
            warning90Days: { type: "number" },
          },
        },
        activity: {
          type: "object",
          properties: {
            dispensationsToday: { type: "number" },
            dispensationsWeek: { type: "number" },
            prescriptionsToday: { type: "number" },
            prescriptionsWeek: { type: "number" },
            newPatientsToday: { type: "number" },
            newPatientsWeek: { type: "number" },
          },
        },
        counts: {
          type: "object",
          properties: {
            totalPatients: { type: "number" },
            totalPrescriptions: { type: "number" },
            totalDispensations: { type: "number" },
            totalDrugs: { type: "number" },
            totalBatches: { type: "number" },
          },
        },
      },
    },
  },
};

export async function dashboardRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  fastify.get("/stats", {
    schema: {
      description: "Récupérer les statistiques globales du tableau de bord",
      tags: ["Dashboard"],
      response: {
        200: dashboardStatsResponseSchema,
        401: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
    preHandler: [requireAuth],
    handler: dashboardController.getStats,
  });
}
