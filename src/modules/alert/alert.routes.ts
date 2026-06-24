import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { alertController } from "./alert.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "../../prisma/generated/prisma/client.js";

export async function alertRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/alerts
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: alertController.list,
  });

  // POST /api/alerts/:id/acknowledge
  fastify.post("/:id/acknowledge", {
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
