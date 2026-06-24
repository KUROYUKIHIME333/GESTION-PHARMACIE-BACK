import { z } from "zod";
import { PaymentMethod } from "../../prisma/generated/prisma/client.js";

export const dispensationLineInputSchema = z.object({
  prescriptionLineId: z
    .string()
    .cuid("ID ligne d'ordonnance invalide")
    .optional(),
  drugId: z.string().cuid("ID médicament invalide"),
  quantity: z.number().int().positive("La quantité doit être positive"),
});

export const dispensationCreateSchema = z.object({
  patientId: z.string().cuid("ID patient invalide"),
  prescriptionId: z.string().cuid().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  totalAmountCDF: z.number().nonnegative().optional(),
  totalAmountUSD: z.number().nonnegative().optional(),
  amountPaidCDF: z.number().nonnegative().optional(),
  amountPaidUSD: z.number().nonnegative().optional(),
  insuranceCoverage: z.number().nonnegative().optional(),
  receiptNumber: z.string().max(50).optional(),
  lines: z
    .array(dispensationLineInputSchema)
    .min(1, "Au moins une ligne de dispensation est requise"),
  notes: z.string().optional(),
});

export const dispensationQuerySchema = z.object({
  patientId: z.string().optional(),
  prescriptionId: z.string().optional(),
  page: z.string().transform(Number).default(1),
  limit: z.string().transform(Number).default(20),
});

export type DispensationLineInput = z.infer<typeof dispensationLineInputSchema>;
export type DispensationCreateInput = z.infer<typeof dispensationCreateSchema>;
export type DispensationQueryInput = z.infer<typeof dispensationQuerySchema>;
