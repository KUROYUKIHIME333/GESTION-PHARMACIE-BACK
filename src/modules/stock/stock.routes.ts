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
    handler: stockController.getOverview,
  });

  // GET /api/stock/:drugId - Détail stock d'un médicament
  fastify.get("/:drugId", {
    preHandler: [requireAuth],
    handler: stockController.getOne,
  });
}
