import { z } from "zod";
import {
  DrugForm,
  DrugCategory,
  StorageCondition,
} from "../../prisma/generated/prisma/client.js";

export const drugCreateSchema = z.object({
  code: z.string().min(1, "Code requis").max(50),
  name: z.string().min(1, "Nom requis").max(255),
  genericName: z.string().max(255).optional(),
  dci: z.string().min(1, "DCI requise").max(255),
  form: z.nativeEnum(DrugForm),
  category: z.nativeEnum(DrugCategory),
  therapeuticClass: z.string().max(255).optional(),
  dosage: z.string().min(1, "Dosage requis").max(100),
  concentration: z.string().max(100).optional(),
  unitOfDispense: z.string().min(1, "Unité de dispensation requise").max(50),
  packSize: z.number().int().min(1).default(1),
  packUnit: z.string().max(50).default("boîte"),
  ammNumber: z.string().max(100).optional(),
  isEssential: z.boolean().default(false),
  isControlled: z.boolean().default(false),
  controlledSchedule: z.string().max(10).optional(),
  isProgramDrug: z.boolean().default(false),
  programName: z.string().max(100).optional(),
  storageConditions: z.array(z.nativeEnum(StorageCondition)).default([]),
  requiresColdChain: z.boolean().default(false),
  minTemp: z.number().optional(),
  maxTemp: z.number().optional(),
  unitPriceCDF: z.number().nonnegative().optional(),
  unitPriceUSD: z.number().nonnegative().optional(),
  isPriceRegulated: z.boolean().default(false),
  minStockLevel: z.number().int().nonnegative().default(0),
  criticalStockLevel: z.number().int().nonnegative().default(0),
  reorderPoint: z.number().int().nonnegative().default(0),
  reorderQuantity: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export const drugUpdateSchema = drugCreateSchema.partial();

export const drugQuerySchema = z.object({
  search: z.string().optional(),
  category: z.nativeEnum(DrugCategory).optional(),
  isEssential: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  isControlled: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  page: z.string().transform(Number).default(1),
  limit: z.string().transform(Number).default(20),
});

export type DrugCreateInput = z.infer<typeof drugCreateSchema>;
export type DrugUpdateInput = z.infer<typeof drugUpdateSchema>;
export type DrugQueryInput = z.infer<typeof drugQuerySchema>;
