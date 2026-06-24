import { z } from "zod";

export const batchCreateSchema = z.object({
  batchNumber: z.string().min(1, "Numéro de lot requis").max(100),
  drugId: z.string().cuid("ID médicament invalide"),
  supplierId: z.string().cuid().optional(),
  initialQuantity: z
    .number()
    .int()
    .positive("La quantité initiale doit être positive"),
  expiryDate: z
    .string()
    .datetime()
    .transform((str) => new Date(str)),
  manufacturingDate: z
    .string()
    .datetime()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
  purchasePriceCDF: z.number().nonnegative().optional(),
  purchasePriceUSD: z.number().nonnegative().optional(),
  locationId: z.string().cuid().optional(),
  coldChainVerified: z.boolean().default(false),
  notes: z.string().optional(),
});

export const batchQuarantineSchema = z.object({
  isQuarantined: z.boolean(),
  quarantineReason: z.string().min(1, "Motif de quarantaine requis").optional(),
});

export const batchQuerySchema = z.object({
  drugId: z.string().optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  isQuarantined: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  page: z.string().transform(Number).default(1),
  limit: z.string().transform(Number).default(20),
});

export type BatchCreateInput = z.infer<typeof batchCreateSchema>;
export type BatchQuarantineInput = z.infer<typeof batchQuarantineSchema>;
export type BatchQueryInput = z.infer<typeof batchQuerySchema>;
