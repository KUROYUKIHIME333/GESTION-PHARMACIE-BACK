import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@/lib/prisma.js";

const AUDITABLE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export async function auditMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // On n'audite pas les GET ni les erreurs
  if (!AUDITABLE_METHODS.includes(request.method)) return;
  if (reply.statusCode >= 400) return;

  try {
    const route = request.routerPath ?? request.url;
    const action = `${request.method}_${route
      .replace(/\//g, "_")
      .replace(/:/g, "")}`;
    const entity = route.split("/")[2] ?? "unknown";

    await prisma.auditLog.create({
      data: {
        userId: request.user?.id ?? null,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
        action,
        entity: entity.toUpperCase(),
        entityId: (request.params as Record<string, string>)?.id ?? null,
        changes: request.body ? JSON.stringify(request.body) : null,
      },
    });
  } catch {
    // L'audit ne doit jamais faire échouer la requête principale
    // En production, logger vers un système de log externe
  }
}
