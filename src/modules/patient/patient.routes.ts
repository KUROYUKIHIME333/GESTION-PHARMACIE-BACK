import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ZodError } from "zod";
import {
  patientCreateSchema,
  patientUpdateSchema,
  patientQuerySchema,
  allergyCreateSchema,
} from "./patient.schemas.js";
import {
  listPatients,
  getPatientById,
  createPatient,
  updatePatient,
  addPatientAllergy,
  getPatientAllergies,
} from "./patient.services.js";
import { requireAuth } from "@/plugins/auth.plugins.js";
import { AppError } from "@/lib/error.js";
import { UserRole } from "@/prisma/generated/prisma/client.js";

export async function patientRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/patients - Liste des patients
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      try {
        const query = patientQuerySchema.parse(request.query);
        const result = await listPatients(query);
        return reply.status(200).send({ success: true, data: result });
      } catch (error) {
        if (error instanceof ZodError) {
          throw AppError.validation("Paramètres invalides", {
            issues: error.issues,
          });
        }
        throw error;
      }
    },
  });

  // POST /api/patients - Créer un patient
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
    handler: async (request, reply) => {
      try {
        const data = patientCreateSchema.parse(request.body);
        const patient = await createPatient(data);
        return reply.status(201).send({ success: true, data: patient });
      } catch (error) {
        if (error instanceof ZodError) {
          throw AppError.validation("Données invalides", {
            issues: error.issues,
          });
        }
        throw error;
      }
    },
  });

  // GET /api/patients/:id - Détail d'un patient
  fastify.get("/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const patient = await getPatientById(id);
      return reply.status(200).send({ success: true, data: patient });
    },
  });

  // PUT /api/patients/:id - Modifier un patient
  fastify.put("/:id", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR
      ),
    ],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = patientUpdateSchema.parse(request.body);
        const patient = await updatePatient(id, data);
        return reply.status(200).send({ success: true, data: patient });
      } catch (error) {
        if (error instanceof ZodError) {
          throw AppError.validation("Données invalides", {
            issues: error.issues,
          });
        }
        throw error;
      }
    },
  });

  // POST /api/patients/:id/allergies - Ajouter une allergie
  fastify.post("/:id/allergies", {
    preHandler: [
      requireAuth,
      fastify.requireRole(
        UserRole.SUPERADMIN,
        UserRole.PHARMACIST,
        UserRole.DOCTOR
      ),
    ],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = allergyCreateSchema.parse(request.body);
        const allergy = await addPatientAllergy(id, data);
        return reply.status(201).send({ success: true, data: allergy });
      } catch (error) {
        if (error instanceof ZodError) {
          throw AppError.validation("Données invalides", {
            issues: error.issues,
          });
        }
        throw error;
      }
    },
  });

  // GET /api/patients/:id/allergies - Lister les allergies
  fastify.get("/:id/allergies", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const allergies = await getPatientAllergies(id);
      return reply.status(200).send({ success: true, data: allergies });
    },
  });
}
