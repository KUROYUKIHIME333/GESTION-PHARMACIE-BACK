import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { requireAuth } from "../../plugins/auth.plugins.js";
import { authController } from "./auth.controller.js";

// Définition des structures réutilisables pour la documentation
const userResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    employeeId: { type: "string", nullable: true },
    firstName: { type: "string" },
    lastName: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    role: { type: "string" },
    serviceId: { type: "string" },
    isActive: { type: "boolean" },
    mustChangePassword: { type: "boolean" },
    failedLoginCount: { type: "number" },
  },
};

const authResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    data: {
      type: "object",
      properties: {
        user: userResponseSchema,
        token: { type: "string" },
      },
    },
  },
};

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
          role: { type: "string" },
          serviceId: { type: "string" },
        },
        required: ["firstName", "lastName", "email", "password", "role"],
      },
      response: {
        201: authResponseSchema,
        400: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            details: { type: "object" },
          },
        },
        409: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
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
      response: {
        200: authResponseSchema,
        401: {
          type: "object",
          properties: {
            success: { type: "boolean", default: false },
            message: { type: "string" },
          },
        },
      },
    },
    handler: authController.login.bind(authController),
  });

  // POST /api/auth/logout
  fastify.post("/logout", {
    schema: {
      description: "Déconnexion utilisateur",
      tags: ["Auth"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
    preHandler: [requireAuth], // On s'assure qu'il est connecté avant de déconnecter, ce serait débile sinon
    handler: authController.logout.bind(authController),
  });

  // POST /api/auth/change-password
  fastify.post("/change-password", {
    schema: {
      description: "Changement de mot de passe",
      tags: ["Auth"],
      body: {
        type: "object",
        required: ["oldPassword", "newPassword"],
        properties: {
          oldPassword: { type: "string", minLength: 8 },
          newPassword: { type: "string", minLength: 8 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
        401: {
          type: "object",
          properties: {
            success: { type: "boolean", default: false },
            message: { type: "string" },
          },
        },
      },
    },
    preHandler: [requireAuth],
    handler: authController.changePassword.bind(authController),
  });

  // GET /api/auth/me
  fastify.get("/me", {
    schema: {
      description: "Récupérer l'utilisateur connecté",
      tags: ["Auth"],
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object", properties: { user: userResponseSchema } },
          },
        },
        401: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
    preHandler: [requireAuth],
    handler: authController.getMe,
  });
}
