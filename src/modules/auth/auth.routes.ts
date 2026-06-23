import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import { registerUser, loginUser, getCurrentUser } from "./auth.services.js";
import { requireAuth } from "../../plugins/auth.plugins.js";
import { ValidationError } from "../../lib/error.js";
import { ZodError } from "zod";
import { authController } from "./auth.controller.js";

export async function authRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // POST /api/auth/register
  fastify.post("/register", {
    schema: {
      description: "Inscription d'un nouvel utilisateur",
      tags: ["Auth"],
      body: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          password: { type: "string", minLength: 8 },
          role: {
            type: "string",
            enum: [
              "SUPERADMIN",
              "PHARMACIST",
              "PHARMACY_TECH",
              "DOCTOR",
              "NURSE",
              "CASHIER",
              "STOCK_MANAGER",
              "AUDITOR",
            ],
          },
          serviceId: { type: "string" },
        },
        required: ["firstName", "lastName", "email", "password", "role"],
      },
    },
    handler: authController.register.bind(authController),
  });

  // POST /api/auth/login
  fastify.post("/login", {
    schema: {
      description: "Connexion utilisateur",
      tags: ["Auth"],
      body: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
        required: ["email", "password"],
      },
    },
    handler: authController.login.bind(authController),
  });

  // GET /api/auth/me
  fastify.get("/me", {
    schema: {
      description: "Récupérer l'utilisateur connecté",
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [requireAuth],
    handler: authController.getMe.bind(authController),
  });
}
