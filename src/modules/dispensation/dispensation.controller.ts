import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError, z } from "zod";
import {
  dispensationCreateSchema,
  dispensationQuerySchema,
} from "./dispensation.schemas.js";
import {
  createDispensation,
  listDispensations,
  getDispensationById,
} from "./dispensation.services.js";
import { AppError } from "../../lib/error.js";

const paramsSchema = z.object({ id: z.string() });

export class DispensationController {
  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = dispensationCreateSchema.parse(request.body);
      // Utilisation du cast temporaire pour l'ID utilisateur
      const userId = (request as any).user.id;
      const result = await createDispensation(data, userId);
      return reply.status(201).send({ success: true, data: result });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = dispensationQuerySchema.parse(request.query);
      const result = await listDispensations(query);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  getOne = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const result = await getDispensationById(id);
      return reply.status(200).send({ success: true, data: result });
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

export const dispensationController = new DispensationController();
