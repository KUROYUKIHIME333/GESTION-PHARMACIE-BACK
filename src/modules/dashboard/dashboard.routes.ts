import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { dashboardController } from "./dashboard.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";

export async function dashboardRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  fastify.get("/stats", {
    preHandler: [requireAuth],
    handler: dashboardController.getStats,
  });
}
