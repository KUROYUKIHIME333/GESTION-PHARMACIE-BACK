import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import { registerUser, loginUser, getCurrentUser } from "./auth.services.js";
import { AppError } from "../../lib/error.js"; // Votre classe unique

/**
 * AuthController centralise la logique HTTP pour les routes d'authentification.
 * Utilise des méthodes fléchées pour éviter le .bind(this).
 */
export class AuthController {
  register = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = registerSchema.parse(request.body);
      const result = await registerUser(data);

      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = loginSchema.parse(request.body);
      const result = await loginUser(data);

      reply.setCookie("token", result.token, {
        path: "/", // Accessible sur tout le site
        httpOnly: true, // Empêche l'accès au cookie via JavaScript (XSS)
        secure: true, // Nécessite HTTPS (mettez false en dev local)
        sameSite: "lax", // Protection contre CSRF
        maxAge: 60 * 60 * 24, // Expiration (ex: 7 jours en secondes)
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    // Le type 'any' est temporaire ici si vous n'avez pas encore
    // étendu le type global FastifyRequest
    const userId = (request as any).user?.id;

    if (!userId) {
      throw AppError.unauthorized("Utilisateur non authentifié");
    }

    const user = await getCurrentUser(userId);

    return reply.status(200).send({
      success: true,
      data: { user },
    });
  };

  /**
   * Transforme les erreurs (notamment Zod) en AppError
   */
  private formatError(error: unknown): Error {
    if (error instanceof ZodError) {
      return AppError.validation("Données invalides", {
        issues: error.issues,
      });
    }
    // Retourne l'erreur originale si elle est déjà une AppError
    // ou une erreur système inattendue
    return error as Error;
  }
}

export const authController = new AuthController();
