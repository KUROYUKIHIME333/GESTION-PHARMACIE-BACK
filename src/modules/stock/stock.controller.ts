import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { getStockOverview, getStockByDrugId } from "./stock.services.js";
import { AppError } from "../../lib/error.js";

const paramsSchema = z.object({
  drugId: z.string().cuid("ID de médicament invalide"),
});

export class StockController {
  getOverview = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stock = await getStockOverview();

      // Logique calculée ici pour garder le service propre
      const summary = {
        totalDrugs: stock.length,
        drugsInStock: stock.filter((s) => s.totalQuantity > 0).length,
        drugsBelowMin: stock.filter((s) => s.isBelowMin).length,
        drugsCritical: stock.filter((s) => s.isCritical).length,
        totalValueCDF: stock.reduce(
          (sum, s) =>
            sum +
            (s.unitPriceCDF ? s.unitPriceCDF.toNumber() * s.totalQuantity : 0),
          0
        ),
      };

      return reply.status(200).send({
        success: true,
        data: { items: stock, summary },
      });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  getOne = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { drugId } = paramsSchema.parse(request.params);
      const detail = await getStockByDrugId(drugId);

      if (!detail) {
        throw AppError.notFound("Stock non trouvé pour ce médicament");
      }

      return reply.status(200).send({ success: true, data: detail });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  private formatError(error: unknown): Error {
    if (error instanceof z.ZodError) {
      return AppError.validation("Données invalides", { issues: error.issues });
    }
    return error as Error;
  }
}

export const stockController = new StockController();
