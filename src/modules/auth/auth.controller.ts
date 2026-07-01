import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  ChangePasswordInput,
} from "./auth.schemas.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  changeMyPasssword,
} from "./auth.services.js";
import { AppError } from "../../lib/error.js"; // Votre classe unique
import { getUserConnected } from "@/plugins/auth.plugins.js";

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
      const userAgent = request.headers["user-agent"];
      const ipAddress = request.ip;
      const data = loginSchema.parse(request.body);

      const result = await loginUser(data, { userAgent, ipAddress });

      const { token, ...reste } = result;

      reply.setCookie("token", token, {
        path: "/", // Accessible sur tout le site
        httpOnly: true, // Empêche l'accès au cookie via JavaScript (XSS)
        secure: true, // Nécessite HTTPS (mettez false en dev local)
        sameSite: "none", // Remplacé par lax en prod si on utilise le meme domaine Protection contre CSRF
        partitioned: true, // Partitionner pour permettre le cross-site aussi, false ou retirer si meme domaine
        maxAge: 60 * 60 * 24, // Expiration (ex: 7 jours en secondes)
      });

      return reply.status(200).send({
        success: true,
        data: reste,
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

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUserConnected(request);
      console.log(user)

      if (user) {
        // Suppression en base
        await logoutUser(user.id, request.ip);
      }

      // Suppression du cookie côté client
      reply.clearCookie("token", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "none",
        partitioned: true,
      });

      return reply
        .status(200)
        .send({ success: true, message: "Déconnecté avec succès" });
    } catch (error) {
      throw this.formatError(error);
    }
  };

  changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUserConnected(request);

      if (!user) throw AppError.unauthorized("Non authentifié");

      const passwords = changePasswordSchema.parse(request.body);

      const datas: ChangePasswordInput = {
        userId: user.id,
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      };

      await changeMyPasssword(datas);

      reply.clearCookie("token", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "none",
        partitioned: true,
      });

      return reply
        .status(200)
        .send({ success: true, message: "Mot de passe modifié avec succès" });
    } catch (error) {
      throw this.formatError(error);
    }
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
