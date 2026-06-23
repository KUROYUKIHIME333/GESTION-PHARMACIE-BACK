import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { UserRole } from "../prisma/generated/prisma/client.js";
import { ForbiddenError } from "../lib/error.js";

declare module "fastify" {
  interface FastifyInstance {
    requireRole: (
      ...roles: UserRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => void;
  }
}

const rbacPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("requireRole", (...allowedRoles: UserRole[]) => {
    return (request: FastifyRequest, _reply: FastifyReply): void => {
      if (!request.user) {
        throw new ForbiddenError("Authentification requise");
      }

      if (!allowedRoles.includes(request.user.role)) {
        throw new ForbiddenError(
          `Rôle requis : ${allowedRoles.join(" ou ")}. Votre rôle : ${
            request.user.role
          }`
        );
      }
    };
  });
};

export const rbac = fp(rbacPlugin, {
  name: "rbac",
  dependencies: ["authenticate"],
});
