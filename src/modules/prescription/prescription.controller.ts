import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError, z } from "zod";
import {
  prescriptionCreateSchema,
  prescriptionLineCreateSchema,
  prescriptionStatusUpdateSchema,
  prescriptionQuerySchema,
} from "./prescription.schemas.js";
import {
  listPrescriptions,
  getPrescriptionById,
  createPrescription,
  addPrescriptionLine,
  updatePrescriptionStatus,
} from "./prescription.services.js";
import { AppError } from "@/lib/error.js";

const paramsSchema = z.object({ id: z.string() });

export class PrescriptionController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = prescriptionQuerySchema.parse(request.query);
      const result = await listPrescriptions(query);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  getOne = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const prescription = await getPrescriptionById(id);
      if (!prescription) throw AppError.notFound("Ordonnance non trouvée");
      return reply.status(200).send({ success: true, data: prescription });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = prescriptionCreateSchema.parse(request.body);
      // WARNING: Caster temporaire comme convenu avant extension des types globaux
      const userId = (request as any).user.id;
      const prescription = await createPrescription(data, userId);
      return reply.status(201).send({ success: true, data: prescription });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  addLine = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const data = prescriptionLineCreateSchema.parse(request.body);
      const line = await addPrescriptionLine(id, data);
      return reply.status(201).send({ success: true, data: line });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  updateStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const data = prescriptionStatusUpdateSchema.parse(request.body);
      const prescription = await updatePrescriptionStatus(id, data);
      return reply.status(200).send({ success: true, data: prescription });
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

export const prescriptionController = new PrescriptionController();
