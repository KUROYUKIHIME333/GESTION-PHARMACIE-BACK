import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { verifyJwt, JwtPayload } from "@/lib/crypto.js";
import { UnauthorizedError } from "../lib/error.js";
import { prisma } from "@/lib/prisma.js";
import { User, UserRole } from "../prisma/generated/prisma/client.js";

declare module "fastify" {
  interface FastifyRequest {
    user: User;
  }
}

export interface AuthenticateOptions {
  required?: boolean;
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("user", null as unknown as User);

  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        // Si la route nécessite l'authentification, on lève une erreur
        // Sinon on laisse passer
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
          throw new UnauthorizedError("Utilisateur introuvable");
        }

        if (!user.isActive) {
          throw new UnauthorizedError("Compte désactivé");
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new UnauthorizedError(
            `Compte verrouillé jusqu'à ${user.lockedUntil.toISOString()}`
          );
        }

        request.user = user;
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          throw err;
        }
        throw new UnauthorizedError("Token invalide ou expiré");
      }
    }
  );
};

export const authenticate = fp(authPlugin, { name: "authenticate" });

export function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): void {
  if (!request.user) {
    throw new UnauthorizedError("Authentification requise");
  }
}
