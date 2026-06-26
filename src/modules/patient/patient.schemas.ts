import { z } from "zod";
import {
  Gender,
  AllergySeverity,
} from "../../prisma/generated/prisma/client.js";

export const patientCreateSchema = z.object({
  hospitalNumber: z.string().min(1, "Numéro de dossier requis").max(50),
  firstName: z.string().min(1, "Prénom requis").max(100),
  lastName: z.string().min(1, "Nom requis").max(100),
  dateOfBirth: z
    .string()
    .datetime()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
  gender: z.nativeEnum(Gender).default(Gender.UNKNOWN),
  nationalId: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  commune: z.string().max(100).optional(),
  territoire: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  insuranceId: z.string().cuid().optional(),
  ongCoverageRef: z.string().max(100).optional(),
  isHivPatient: z.boolean().optional(),
  arvCode: z.string().max(50).optional(),
  isTbPatient: z.boolean().optional(),
  tbCode: z.string().max(50).optional(),
  chronicConditions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export const patientUpdateSchema = patientCreateSchema.partial();

export const patientQuerySchema = z.object({
  search: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  page: z.string().transform(Number).default(1),
  limit: z.string().transform(Number).default(20),
});

export const allergyCreateSchema = z.object({
  substance: z.string().min(1, "Substance allergisante requise").max(255),
  reaction: z.string().optional(),
  severity: z.nativeEnum(AllergySeverity),
  confirmedAt: z
    .string()
    .datetime()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
  confirmedBy: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;
export type PatientQueryInput = z.infer<typeof patientQuerySchema>;
export type AllergyCreateInput = z.infer<typeof allergyCreateSchema>;
