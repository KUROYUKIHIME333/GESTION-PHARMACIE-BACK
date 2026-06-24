import { z } from "zod";
import { AlertStatus } from "../../prisma/generated/prisma/client.js";

export const alertAcknowledgeSchema = z.object({
  status: z
    .nativeEnum(AlertStatus)
    .refine((val) => Object.values(AlertStatus).includes(val), {
      message: "Statut invalide (ACTIVE, ACKNOWLEDGED, RESOLVED, IGNORED)",
    }),
  comment: z.string().max(500).optional(),
});

export const alertQuerySchema = z.object({
  type: z.string().optional(),
  status: z.nativeEnum(AlertStatus).optional(),
  drugId: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
});

export type AlertAcknowledgeInput = z.infer<typeof alertAcknowledgeSchema>;
export type AlertQueryInput = z.infer<typeof alertQuerySchema>;
