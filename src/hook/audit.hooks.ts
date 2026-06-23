import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@/lib/prisma.js";
import { Prisma } from "@/prisma/generated/prisma/client.js";

const AUDITABLE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export async function auditMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // On n'audite pas les méthodes non listées ou les erreurs (HTTP >= 400)
  if (!AUDITABLE_METHODS.includes(request.method)) return;
  if (reply.statusCode >= 400) return;

  // Accès dynamique nécessaire car routerPath n'est pas dans le type FastifyRequest par défaut
  const reqAny = request as any;
  const route = reqAny.routerPath ?? request.url;

  try {
    const action = `${request.method}_${route
      .replace(/\//g, "_")
      .replace(/:/g, "")}`;

    // Extraction de l'entité (ex: /api/users/123 -> users)
    const parts = route.split("/");
    const entity = parts[2] ?? "unknown";

    // Sécurisation : on filtre les données sensibles du body
    const body = (request.body as Record<string, any>) || {};
    const { password, token, ...safeBody } = body;

    await prisma.auditLog.create({
      data: {
        userId: reqAny.user?.id ?? null,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
        action,
        entity: entity.toUpperCase(),
        entityId: (request.params as Record<string, string>)?.id ?? null,

        // Si safeBody est vide, on utilise Prisma.JsonNull pour respecter le typage
        changes: Object.keys(safeBody).length > 0 ? safeBody : Prisma.JsonNull,
      },
    });
  } catch (error) {
    // Audit silencieux : ne jamais interrompre la requête client en cas d'échec de l'audit
    console.error("Audit Middleware error:", error);
  }
}
