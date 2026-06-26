import { z } from "zod";
import { PrescriptionStatus } from "../../prisma/generated/prisma/client.js";

export const prescriptionCreateSchema = z.object({
  patientId: z.string().cuid("ID patient invalide"),
  prescribedById: z.string().cuid("ID prescripteur invalide").optional(),
  serviceId: z.string().cuid().optional(),
  isInpatient: z.boolean().default(false),
  admissionRef: z.string().max(100).optional(),
  diagnosisCode: z.string().max(50).optional(),
  diagnosisLabel: z.string().max(255).optional(),
  notes: z.string().optional(),
});

export const prescriptionLineCreateSchema = z.object({
  drugId: z.string().cuid("ID médicament invalide"),
  quantityPrescribed: z
    .number()
    .int()
    .positive("La quantité doit être positive"),
  dosage: z.string().min(1, "Posologie requise").max(500),
  frequency: z.string().max(100).optional(),
  durationDays: z.number().int().positive().optional(),
  route: z.string().max(50).optional(),
  instructions: z.string().optional(),
});

export const prescriptionStatusUpdateSchema = z.object({
  status: z.nativeEnum(PrescriptionStatus),
});

export const prescriptionQuerySchema = z.object({
  patientId: z.string().optional(),
  status: z.nativeEnum(PrescriptionStatus).optional(),
  prescribedById: z.string().optional(),
  page: z.string().transform(Number).default(1),
  limit: z.string().transform(Number).default(20),
});

export type PrescriptionCreateInput = z.infer<typeof prescriptionCreateSchema>;
export type PrescriptionLineCreateInput = z.infer<
  typeof prescriptionLineCreateSchema
>;
export type PrescriptionStatusUpdateInput = z.infer<
  typeof prescriptionStatusUpdateSchema
>;
export type PrescriptionQueryInput = z.infer<typeof prescriptionQuerySchema>;
