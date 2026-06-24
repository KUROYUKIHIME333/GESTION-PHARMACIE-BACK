import { prisma } from "@/lib/prisma.js";
import { AppError } from "../../lib/error.js";
import {
  DrugCreateInput,
  DrugUpdateInput,
  DrugQueryInput,
} from "./drug.schemas.js";
import { Prisma } from "@/prisma/generated/prisma/client.js";

export interface DrugListResult {
  drugs: Array<{
    id: string;
    code: string;
    name: string;
    genericName: string | null;
    dci: string;
    form: string;
    category: string;
    isEssential: boolean;
    isControlled: boolean;
    unitPriceCDF: Prisma.Decimal | null;
    unitPriceUSD: Prisma.Decimal | null;
    minStockLevel: number;
    criticalStockLevel: number;
    isActive: boolean;
    _count?: { batches: number };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listDrugs(
  query: DrugQueryInput
): Promise<DrugListResult> {
  const { search, category, isEssential, isControlled, isActive, page, limit } =
    query;
  const skip = (page - 1) * limit;

  const where: Prisma.DrugWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { dci: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) where.category = category;
  if (isEssential !== undefined) where.isEssential = isEssential;
  if (isControlled !== undefined) where.isControlled = isControlled;
  if (isActive !== undefined) where.isActive = isActive;

  const [drugs, total] = await Promise.all([
    prisma.drug.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        genericName: true,
        dci: true,
        form: true,
        category: true,
        isEssential: true,
        isControlled: true,
        unitPriceCDF: true,
        unitPriceUSD: true,
        minStockLevel: true,
        criticalStockLevel: true,
        isActive: true,
        _count: { select: { batches: true } },
      },
    }),
    prisma.drug.count({ where }),
  ]);

  return {
    drugs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDrugById(id: string) {
  const drug = await prisma.drug.findUnique({
    where: { id },
    include: {
      batches: {
        where: { isActive: true },
        orderBy: { expiryDate: "asc" },
        select: {
          id: true,
          batchNumber: true,
          currentQuantity: true,
          expiryDate: true,
          isQuarantined: true,
        },
      },
      _count: {
        select: {
          prescriptionLines: true,
          dispensationLines: true,
          orderLines: true,
        },
      },
    },
  });

  if (!drug) {
    throw AppError.notFound("Médicament", id);
  }

  return drug;
}

export async function createDrug(input: DrugCreateInput, _createdById: string) {
  const existingCode = await prisma.drug.findUnique({
    where: { code: input.code },
  });

  if (existingCode) {
    throw AppError.conflict(
      `Un médicament avec le code "${input.code}" existe déjà`
    );
  }

  const drug = await prisma.drug.create({
    data: {
      ...input,
      unitPriceCDF: input.unitPriceCDF
        ? new Prisma.Decimal(input.unitPriceCDF)
        : null,
      unitPriceUSD: input.unitPriceUSD
        ? new Prisma.Decimal(input.unitPriceUSD)
        : null,
    },
  });

  return drug;
}

export async function updateDrug(id: string, input: DrugUpdateInput) {
  const existing = await prisma.drug.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Médicament", id);
  }

  if (input.code && input.code !== existing.code) {
    const codeExists = await prisma.drug.findUnique({
      where: { code: input.code },
    });
    if (codeExists) {
      throw AppError.conflict(
        `Un médicament avec le code "${input.code}" existe déjà`
      );
    }
  }

  const updateData: Prisma.DrugUpdateInput = {
    ...input,
    unitPriceCDF:
      input.unitPriceCDF !== undefined
        ? new Prisma.Decimal(input.unitPriceCDF)
        : undefined,
    unitPriceUSD:
      input.unitPriceUSD !== undefined
        ? new Prisma.Decimal(input.unitPriceUSD)
        : undefined,
  };

  // Supprimer les undefined pour Prisma
  Object.keys(updateData).forEach((key) => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  const drug = await prisma.drug.update({
    where: { id },
    data: updateData,
  });

  return drug;
}

export async function deleteDrug(id: string) {
  const existing = await prisma.drug.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Médicament", id);
  }

  // Vérifier s'il y a des lots actifs
  const activeBatches = await prisma.batch.count({
    where: { drugId: id, isActive: true },
  });

  if (activeBatches > 0) {
    // Soft delete : désactiver au lieu de supprimer
    return prisma.drug.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Hard delete si aucun lot actif
  return prisma.drug.delete({ where: { id } });
}
