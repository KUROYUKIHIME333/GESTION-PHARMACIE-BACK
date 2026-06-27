import { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { verifyJwt } from "@/lib/crypto.js";
import { AppError } from "../lib/error.js";
import { prisma } from "@/lib/prisma.js";
import { User } from "../prisma/generated/prisma/client.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User; // Rendu optionnel pour gérer les routes publiques/privées
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // On retire le decorateRequest initialisation à null car il n'est pas nécessaire
  // si on utilise le typage optionnel ci-dessus.

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    // Récupération depuis le cookie (nommez votre cookie comme configuré dans votre auth controller)
    const token = request.cookies["token"];

    console.log("Le token du ops: ", token)

    if (!token) {
      return; // On ne throw pas ici pour permettre des routes publiques
    }

    try {
      const decoded = verifyJwt(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { service: true },
      });

      if (
        user &&
        user.isActive &&
        (!user.lockedUntil || user.lockedUntil < new Date())
      ) {
        request.user = user;
      }
    } catch (err) {
      // On ignore les erreurs de token ici pour que request.user reste undefined
      // C'est le rôle de requireAuth de throw si l'accès est refusé.
    }
  });
};

export const authenticate = fp(authPlugin, { name: "authenticate" });

export async function requireAuth(request: FastifyRequest): Promise<void> {
  // Si le hook 'onRequest' a échoué à trouver l'user, on bloque la requête
  if (!request.user) {
    throw AppError.unauthorized("Authentification requise ou session expirée");
  }
}
