import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { verifyJwt } from "@/lib/crypto.js";
import { AppError } from "../lib/error.js"; // Votre classe unique
import { prisma } from "@/lib/prisma.js"; // Singleton
import { User } from "../prisma/generated/prisma/client.js";

declare module "fastify" {
  interface FastifyRequest {
    user: User;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Initialisation à null, mais le typage dit 'User' (nécessite le 'as any' ou 'as unknown')
  fastify.decorateRequest("user", null as unknown as User);

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = verifyJwt(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { service: true },
      });

      if (!user) {
        throw AppError.unauthorized("Utilisateur introuvable");
      }

      if (!user.isActive) {
        throw AppError.unauthorized("Compte désactivé");
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw AppError.unauthorized(
          `Compte verrouillé jusqu'à ${user.lockedUntil.toISOString()}`
        );
      }

      request.user = user;
    } catch (err) {
      // Si c'est déjà une AppError, on la laisse passer, sinon on wrappe
      if (err instanceof AppError) throw err;
      throw AppError.unauthorized("Token invalide ou expiré");
    }
  });
};

export const authenticate = fp(authPlugin, { name: "authenticate" });

// Utilisation simple : requireAuth vérifie simplement la présence de request.user
export async function requireAuth(request: FastifyRequest): Promise<void> {
  if (!request.user) {
    throw AppError.unauthorized("Authentification requise");
  }
}
