import { FastifyRequest, FastifyReply } from "fastify";
import { getDashboardStats } from "./dashboard.services.js";

export class DashboardController {
  getStats = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await getDashboardStats();
      return reply.status(200).send({ success: true, data: stats });
    } catch (error) {
      throw error;
    }
  };
}

export const dashboardController = new DashboardController();
