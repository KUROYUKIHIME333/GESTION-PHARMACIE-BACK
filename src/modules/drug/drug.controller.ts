import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError, z } from "zod";
import {
  drugCreateSchema,
  drugUpdateSchema,
  drugQuerySchema,
} from "./drug.schemas.js";
import {
  listDrugs,
  getDrugById,
  createDrug,
  updateDrug,
  deleteDrug,
} from "./drug.services.js";
import { AppError } from "../../lib/error.js";

const paramsSchema = z.object({ id: z.string() });

export class DrugController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = drugQuerySchema.parse(request.query);
      const result = await listDrugs(query);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  getOne = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const drug = await getDrugById(id);
      if (!drug) throw AppError.notFound("Médicament non trouvé");
      return reply.status(200).send({ success: true, data: drug });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = drugCreateSchema.parse(request.body);
      const drug = await createDrug(data, (request as any).user.id);
      return reply.status(201).send({ success: true, data: drug });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const data = drugUpdateSchema.parse(request.body);
      const drug = await updateDrug(id, data);
      return reply.status(200).send({ success: true, data: drug });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      await deleteDrug(id);
      return reply
        .status(200)
        .send({ success: true, message: "Médicament supprimé avec succès" });
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

export const drugController = new DrugController();
