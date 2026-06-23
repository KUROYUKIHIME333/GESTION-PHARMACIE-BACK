import { prisma } from "@/lib/prisma.js";
import { hashPassword, verifyPassword, signJwt } from "@/lib/crypto.js";
import { AppError } from "../../lib/error.js"; // Votre classe unique
import { RegisterInput, LoginInput } from "./auth.schemas.js";
import { User } from "../../prisma/generated/prisma/client.js";

export interface AuthResponse {
  user: Omit<User, "passwordHash">;
  token: string;
}

function sanitizeUser(user: User): Omit<User, "passwordHash"> {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function registerUser(
  input: RegisterInput
): Promise<AuthResponse> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw AppError.conflict("Un utilisateur avec cet email existe déjà");
  }

  if (input.employeeId) {
    const existingEmployee = await prisma.user.findUnique({
      where: { employeeId: input.employeeId },
    });
    if (existingEmployee) {
      throw AppError.conflict("Un utilisateur avec ce matricule existe déjà");
    }
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
      serviceId: input.serviceId,
      isActive: true,
      mustChangePassword: true,
      failedLoginCount: 0,
    },
    include: { service: true },
  });

  const token = signJwt({
    userId: user.id,
    role: user.role,
    email: user.email,
  });

  return { user: sanitizeUser(user), token };
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { service: true },
  });

  if (!user) {
    throw AppError.unauthorized("Email ou mot de passe incorrect");
  }

  if (!user.isActive) {
    throw AppError.unauthorized(
      "Compte désactivé. Contactez un administrateur."
    );
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw AppError.unauthorized(
      `Compte temporairement verrouillé. Réessayez après ${user.lockedUntil.toISOString()}`
    );
  }

  const isValidPassword = await verifyPassword(
    input.password,
    user.passwordHash
  );

  if (!isValidPassword) {
    const newFailedCount = user.failedLoginCount + 1;
    const updates: { failedLoginCount: number; lockedUntil?: Date } = {
      failedLoginCount: newFailedCount,
    };

    if (newFailedCount >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      updates.lockedUntil = lockUntil;
    }

    await prisma.user.update({ where: { id: user.id }, data: updates });
    throw AppError.unauthorized("Email ou mot de passe incorrect");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
    include: { service: true },
  });

  const token = signJwt({
    userId: updatedUser.id,
    role: updatedUser.role,
    email: updatedUser.email,
  });

  return { user: sanitizeUser(updatedUser), token };
}

export async function getCurrentUser(
  userId: string
): Promise<Omit<User, "passwordHash">> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { service: true },
  });

  if (!user) {
    throw AppError.notFound("Utilisateur", userId);
  }

  return sanitizeUser(user);
}
