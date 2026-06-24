import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError, z } from "zod";
import {
  batchCreateSchema,
  batchQuarantineSchema,
  batchQuerySchema,
} from "./batch.schemas.js";
import {
  listBatches,
  getBatchById,
  createBatch,
  quarantineBatch,
} from "./batch.services.js";
import { AppError } from "../../lib/error.js";

const paramsSchema = z.object({ id: z.string() });

export class BatchController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = batchQuerySchema.parse(request.query);
      const result = await listBatches(query);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  getOne = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const batch = await getBatchById(id);
      if (!batch) throw AppError.notFound("Lot non trouvé");
      return reply.status(200).send({ success: true, data: batch });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = batchCreateSchema.parse(request.body);
      const batch = await createBatch(data, (request as any).user.id);
      return reply.status(201).send({ success: true, data: batch });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  quarantine = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const data = batchQuarantineSchema.parse(request.body);
      const batch = await quarantineBatch(id, data, (request as any).user.id);

      return reply.status(200).send({
        success: true,
        data: batch,
        message: data.isQuarantined
          ? "Lot mis en quarantaine"
          : "Lot retiré de la quarantaine",
      });
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

export const batchController = new BatchController();
