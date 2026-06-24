import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { patientController } from "./patient.controller.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

export async function patientRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // Routes publiques (lecture)
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: patientController.list,
  });
  fastify.get("/:id", {
    preHandler: [requireAuth],
    handler: patientController.getOne,
  });
  fastify.get("/:id/allergies", {
    preHandler: [requireAuth],
    handler: patientController.listAllergies,
  });

  // Routes écriture (Patient)
  fastify.post("/", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR,
        UserRole.NURSE
      ),
    ],
    handler: patientController.create,
  });

  fastify.put("/:id", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR
      ),
    ],
    handler: patientController.update,
  });

  // Routes écriture (Allergies)
  fastify.post("/:id/allergies", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR
      ),
    ],
    handler: patientController.addAllergy,
  });
}
