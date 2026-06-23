import { FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import { registerUser, loginUser, getCurrentUser } from "./auth.services.js";
import { ValidationError } from "../../lib/error.js";

/**
 * AuthController handles business logic for authentication routes.
 * Keeping handlers in a class promotes cleaner separation of concerns
 * and easier dependency injection if needed later.
 */
export class AuthController {
  /**
   * Register a new user
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);
      const result = await registerUser(data);

      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Login user
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body);
      const result = await loginUser(data);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    // Note: 'request.user' is populated by the 'requireAuth' preHandler
    const user = await getCurrentUser((request as any).user.id);

    return reply.status(200).send({
      success: true,
      data: { user },
    });
  }

  /**
   * Centralized error handling for the controller
   */
  private handleError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new ValidationError("Données invalides", {
        issues: error.issues,
      });
    }
    // Re-throw if it's not a validation error (e.g., DB error, Auth error)
    throw error;
  }
}

export const authController = new AuthController();
