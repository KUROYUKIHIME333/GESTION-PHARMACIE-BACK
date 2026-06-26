import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError, z } from "zod";
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
import { AppError } from "@/lib/error.js";

const paramsSchema = z.object({ id: z.string() });

export class PatientController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = patientQuerySchema.parse(request.query);
      const result = await listPatients(query);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  getOne = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const patient = await getPatientById(id);
      if (!patient) throw AppError.notFound("Patient non trouvé");
      return reply.status(200).send({ success: true, data: patient });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = patientCreateSchema.parse(request.body);
      const patient = await createPatient(data);
      return reply.status(201).send({ success: true, data: patient });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const data = patientUpdateSchema.parse(request.body);
      const patient = await updatePatient(id, data);
      return reply.status(200).send({ success: true, data: patient });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  addAllergy = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const data = allergyCreateSchema.parse(request.body);
      const allergy = await addPatientAllergy(id, data);
      return reply.status(201).send({ success: true, data: allergy });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  listAllergies = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const allergies = await getPatientAllergies(id);
      return reply.status(200).send({ success: true, data: allergies });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  private formatError(error: unknown): Error {
    if (error instanceof ZodError) {
      return AppError.validation("Données invalides", { issues: error.issues });
    }
    return error as Error;
  }
}

export const patientController = new PatientController();
