import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { UserRole } from "../prisma/generated/prisma/client.js";
import { AppError } from "../lib/error.js";

declare module "fastify" {
  interface FastifyInstance {
    // La méthode décorée doit retourner une fonction de type 'preHandlerHookHandler'
    requireRole: (
      ...roles: UserRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const rbacPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("requireRole", (...allowedRoles: UserRole[]) => {
    return async (
      request: FastifyRequest,
      _reply: FastifyReply
    ): Promise<void> => {
      // 1. Vérification de l'existence de l'utilisateur (déjà authentifié par le plugin 'authenticate')
      if (!request.user) {
        throw AppError.unauthorized("Authentification requise");
      }

      // 2. Vérification des rôles
      if (!allowedRoles.includes(request.user.role)) {
        throw AppError.forbidden(
          `Accès refusé. Rôle(s) requis : ${allowedRoles.join(
            " ou "
          )}. Votre rôle : ${request.user.role}`
        );
      }
    };
  });
};

export const rbac = fp(rbacPlugin, {
  name: "rbac",
  dependencies: ["authenticate"], // S'assure que 'request.user' est bien peuplé avant
});
