import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { getStockOverview, getStockByDrugId } from "./stock.services.js";
import { requireAuth } from "../../plugins/auth.plugins.js";

export async function stockRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // GET /api/stock - Vue stock agrégée
  fastify.get("/", {
    preHandler: [requireAuth],
    handler: async (_request, reply) => {
      const stock = await getStockOverview();
      return reply.status(200).send({
        success: true,
        data: {
          items: stock,
          summary: {
            totalDrugs: stock.length,
            drugsInStock: stock.filter((s) => s.totalQuantity > 0).length,
            drugsBelowMin: stock.filter((s) => s.isBelowMin).length,
            drugsCritical: stock.filter((s) => s.isCritical).length,
            totalValueCDF: stock.reduce(
              (sum, s) =>
                sum +
                (s.unitPriceCDF
                  ? s.unitPriceCDF.toNumber() * s.totalQuantity
                  : 0),
              0
            ),
          },
        },
      });
    },
  });

  // GET /api/stock/:drugId - Détail stock d'un médicament
  fastify.get("/:drugId", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const { drugId } = request.params as { drugId: string };
      const detail = await getStockByDrugId(drugId);
      return reply.status(200).send({ success: true, data: detail });
    },
  });
}
