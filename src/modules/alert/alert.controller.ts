import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError, z } from "zod";
import { alertAcknowledgeSchema, alertQuerySchema } from "./alert.schemas.js";
import { getAlerts, acknowledgeAlert } from "./alert.services.js";
import { AppError } from "@/lib/error.js";

const paramsSchema = z.object({ id: z.string() });

export class AlertController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = alertQuerySchema.parse(request.query);
      const result = await getAlerts(query);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  acknowledge = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsSchema.parse(request.params);
      const data = alertAcknowledgeSchema.parse(request.body);

      // Logique métier de validation métier spécifique
      if (data.status === "IGNORED" && !data.comment) {
        throw AppError.validation(
          "Un commentaire est obligatoire pour ignorer une alerte"
        );
      }

      const userId = (request as any).user.id;
      const result = await acknowledgeAlert(id, data, userId);

      return reply.status(200).send({
        success: true,
        data: result,
        message: "Alerte acquittée avec succès",
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

export const alertController = new AlertController();
