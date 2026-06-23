import { prisma } from "@/lib/prisma.js";
import { AppError } from "../../lib/error.js";
import {
  BatchCreateInput,
  BatchQuarantineInput,
  BatchQueryInput,
} from "./batch.schemas.js";
import { Prisma, MovementType } from "@/prisma/generated/prisma/client.js";

export interface BatchListResult {
  batches: Array<{
    id: string;
    batchNumber: string;
    drug: { id: string; name: string; code: string };
    currentQuantity: number;
    initialQuantity: number;
    expiryDate: Date;
    isQuarantined: boolean;
    isActive: boolean;
    receivedAt: Date;
    supplier: { id: string; name: string } | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listBatches(
  query: BatchQueryInput
): Promise<BatchListResult> {
  const { drugId, isActive, isQuarantined, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.BatchWhereInput = {};

  if (drugId) where.drugId = drugId;
  if (isActive !== undefined) where.isActive = isActive;
  if (isQuarantined !== undefined) where.isQuarantined = isQuarantined;

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ receivedAt: "desc" }],
      include: {
        drug: { select: { id: true, name: true, code: true } },
        supplier: { select: { id: true, name: true } },
      },
    }),
    prisma.batch.count({ where }),
  ]);

  return {
    batches,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getBatchById(id: string) {
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      drug: true,
      supplier: true,
      location: true,
      movements: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!batch) {
    throw AppError.notFound("Lot", id);
  }

  return batch;
}

export async function createBatch(
  input: BatchCreateInput,
  createdById: string
) {
  // Vérifier que le médicament existe
  const drug = await prisma.drug.findUnique({
    where: { id: input.drugId },
  });

  if (!drug) {
    throw AppError.notFound("Médicament", input.drugId);
  }

  // Vérifier l'unicité du numéro de lot par médicament
  const existingBatch = await prisma.batch.findUnique({
    where: {
      batchNumber_drugId: {
        batchNumber: input.batchNumber,
        drugId: input.drugId,
      },
    },
  });

  if (existingBatch) {
    throw AppError.conflict(
      `Le lot "${input.batchNumber}" existe déjà pour ce médicament`
    );
  }

  // Vérifier le fournisseur si fourni
  if (input.supplierId) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: input.supplierId },
    });
    if (!supplier) {
      throw AppError.notFound("Fournisseur", input.supplierId);
    }
  }

  // Vérifier l'emplacement si fourni
  if (input.locationId) {
    const location = await prisma.storageLocation.findUnique({
      where: { id: input.locationId },
    });
    if (!location) {
      throw AppError.notFound("Emplacement de stockage", input.locationId);
    }
  }

  // Vérifier chaîne du froid si médicament le nécessite
  if (drug.requiresColdChain && !input.coldChainVerified) {
    throw AppError.validation(
      "Ce médicament nécessite une vérification de la chaîne du froid"
    );
  }

  const batch = await prisma.$transaction(async (tx) => {
    // Créer le lot
    const newBatch = await tx.batch.create({
      data: {
        batchNumber: input.batchNumber,
        drugId: input.drugId,
        supplierId: input.supplierId,
        initialQuantity: input.initialQuantity,
        currentQuantity: input.initialQuantity,
        expiryDate: input.expiryDate,
        manufacturingDate: input.manufacturingDate,
        purchasePriceCDF: input.purchasePriceCDF
          ? new Prisma.Decimal(input.purchasePriceCDF)
          : null,
        purchasePriceUSD: input.purchasePriceUSD
          ? new Prisma.Decimal(input.purchasePriceUSD)
          : null,
        locationId: input.locationId,
        coldChainVerified: input.coldChainVerified,
        isQuarantined: false,
        isActive: true,
      },
    });

    // Créer le mouvement de stock RECEPTION
    await tx.stockMovement.create({
      data: {
        batchId: newBatch.id,
        type: MovementType.RECEPTION,
        quantity: input.initialQuantity,
        quantityBefore: 0,
        quantityAfter: input.initialQuantity,
        createdById,
        reason: `Réception lot ${input.batchNumber}`,
      },
    });

    return newBatch;
  });

  return batch;
}

export async function quarantineBatch(
  id: string,
  input: BatchQuarantineInput,
  _updatedById: string
) {
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: { drug: true },
  });

  if (!batch) {
    throw AppError.notFound("Lot", id);
  }

  if (input.isQuarantined && !input.quarantineReason) {
    throw AppError.validation("Le motif de quarantaine est obligatoire");
  }

  const updated = await prisma.batch.update({
    where: { id },
    data: {
      isQuarantined: input.isQuarantined,
      quarantineReason: input.isQuarantined ? input.quarantineReason : null,
    },
  });

  return updated;
}
