import { z } from "zod";
import { UserRole } from "../../prisma/generated/prisma/client.js";

export const registerSchema = z.object({
  employeeId: z.string().min(1, "Matricule requis").max(50).optional(),
  firstName: z.string().min(1, "Prénom requis").max(100),
  lastName: z.string().min(1, "Nom requis").max(100),
  email: z.string().email("Email invalide").max(255),
  phone: z.string().max(20).optional(),
  password: z
    .string()
    .min(8, "Le mot de passe doit faire au moins 8 caractères")
    .max(128),
  role: z
    .nativeEnum(UserRole)
    .refine((val) => Object.values(UserRole).includes(val), {
      message: "Rôle invalide",
    }),
  serviceId: z.string().cuid().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z
    .string()
    .min(8, "Le nouveau mot de passe doit faire au moins 8 caractères"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
