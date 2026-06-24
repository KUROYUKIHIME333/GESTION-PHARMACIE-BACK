import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { dispensationController } from "./dispensation.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

export async function dispensationRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // Lecture
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: dispensationController.list,
  });
  fastify.get("/:id", {
    preHandler: [requireAuth],
    handler: dispensationController.getOne,
  });

  // Écriture
  fastify.post("/", {
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
