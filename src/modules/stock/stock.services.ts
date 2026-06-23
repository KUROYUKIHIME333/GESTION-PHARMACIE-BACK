import { prisma } from "@/lib/prisma.js";
import { AppError } from "../../lib/error.js";
// import { NotFoundError } from "@/lib/errors.js";
import { Prisma } from "@/prisma/generated/prisma/client.js";

export interface StockItem {
  drugId: string;
  drugCode: string;
  drugName: string;
  drugDci: string;
  form: string;
  category: string;
  isControlled: boolean;
  requiresColdChain: boolean;
  totalQuantity: number;
  minStockLevel: number;
  criticalStockLevel: number;
  reorderPoint: number;
  unitPriceCDF: Prisma.Decimal | null;
  unitPriceUSD: Prisma.Decimal | null;
  activeBatches: number;
  nearestExpiry: Date | null;
  isBelowMin: boolean;
  isCritical: boolean;
}

export interface StockDetail {
  drug: {
    id: string;
    code: string;
    name: string;
    genericName: string | null;
    dci: string;
    form: string;
    category: string;
    dosage: string;
    unitOfDispense: string;
    minStockLevel: number;
    criticalStockLevel: number;
    reorderPoint: number;
    unitPriceCDF: Prisma.Decimal | null;
    unitPriceUSD: Prisma.Decimal | null;
    isControlled: boolean;
    requiresColdChain: boolean;
  };
  totalQuantity: number;
  batches: Array<{
    id: string;
    batchNumber: string;
    currentQuantity: number;
    expiryDate: Date;
    manufacturingDate: Date | null;
    receivedAt: Date;
    isQuarantined: boolean;
    location: { code: string; name: string } | null;
    purchasePriceCDF: Prisma.Decimal | null;
    purchasePriceUSD: Prisma.Decimal | null;
    daysUntilExpiry: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    severity: "warning" | "critical" | "info";
  }>;
}

export async function getStockOverview(): Promise<StockItem[]> {
  const now = new Date();
  //   const warningDays = 90;

  const drugs = await prisma.drug.findMany({
    where: { isActive: true },
    include: {
      batches: {
        where: {
          isActive: true,
          isQuarantined: false,
          expiryDate: { gt: now },
        },
        select: {
          id: true,
          currentQuantity: true,
          expiryDate: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return drugs.map((drug) => {
    const totalQuantity = drug.batches.reduce(
      (sum, batch) => sum + batch.currentQuantity,
      0
    );

    const nearestExpiry =
      drug.batches.length > 0
        ? drug.batches.reduce(
            (nearest, batch) =>
              batch.expiryDate < nearest ? batch.expiryDate : nearest,
            drug.batches[0].expiryDate
          )
        : null;

    // const daysUntilExpiry = nearestExpiry
    //   ? Math.ceil(
    //       (nearestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    //     )
    //   : null;

    const isBelowMin =
      totalQuantity <= drug.minStockLevel && drug.minStockLevel > 0;
    const isCritical =
      totalQuantity <= drug.criticalStockLevel && drug.criticalStockLevel > 0;
    // const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= warningDays && daysUntilExpiry > 0;
    // const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

    return {
      drugId: drug.id,
      drugCode: drug.code,
      drugName: drug.name,
      drugDci: drug.dci,
      form: drug.form,
      category: drug.category,
      isControlled: drug.isControlled,
      requiresColdChain: drug.requiresColdChain,
      totalQuantity,
      minStockLevel: drug.minStockLevel,
      criticalStockLevel: drug.criticalStockLevel,
      reorderPoint: drug.reorderPoint,
      unitPriceCDF: drug.unitPriceCDF,
      unitPriceUSD: drug.unitPriceUSD,
      activeBatches: drug.batches.length,
      nearestExpiry,
      isBelowMin,
      isCritical,
    };
  });
}

export async function getStockByDrugId(drugId: string): Promise<StockDetail> {
  const drug = await prisma.drug.findUnique({
    where: { id: drugId },
  });

  if (!drug) {
    throw AppError.notFound("Médicament", drugId);
  }

  const now = new Date();
  const warningDays = 90;

  const batches = await prisma.batch.findMany({
    where: {
      drugId,
      isActive: true,
    },
    orderBy: [{ isQuarantined: "asc" }, { expiryDate: "asc" }],
    include: {
      location: { select: { code: true, name: true } },
    },
  });

  const totalQuantity = batches
    .filter((b) => !b.isQuarantined && b.expiryDate > now)
    .reduce((sum, batch) => sum + batch.currentQuantity, 0);

  const batchDetails = batches.map((batch) => {
    const daysUntilExpiry = Math.ceil(
      (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      currentQuantity: batch.currentQuantity,
      expiryDate: batch.expiryDate,
      manufacturingDate: batch.manufacturingDate,
      receivedAt: batch.receivedAt,
      isQuarantined: batch.isQuarantined,
      location: batch.location,
      purchasePriceCDF: batch.purchasePriceCDF,
      purchasePriceUSD: batch.purchasePriceUSD,
      daysUntilExpiry,
    };
  });

  const alerts: StockDetail["alerts"] = [];

  if (totalQuantity <= drug.criticalStockLevel && drug.criticalStockLevel > 0) {
    alerts.push({
      type: "CRITICAL_STOCK",
      message: `Stock critique : ${totalQuantity} unités (seuil : ${drug.criticalStockLevel})`,
      severity: "critical",
    });
  } else if (totalQuantity <= drug.minStockLevel && drug.minStockLevel > 0) {
    alerts.push({
      type: "LOW_STOCK",
      message: `Stock bas : ${totalQuantity} unités (seuil : ${drug.minStockLevel})`,
      severity: "warning",
    });
  }

  batches.forEach((batch) => {
    const daysUntilExpiry = Math.ceil(
      (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 0 && !batch.isQuarantined) {
      alerts.push({
        type: "EXPIRED",
        message: `Lot ${batch.batchNumber} périmé depuis ${Math.abs(
          daysUntilExpiry
        )} jours`,
        severity: "critical",
      });
    } else if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      alerts.push({
        type: "EXPIRY_SOON",
        message: `Lot ${batch.batchNumber} expire dans ${daysUntilExpiry} jours`,
        severity: "critical",
      });
    } else if (daysUntilExpiry <= warningDays && daysUntilExpiry > 30) {
      alerts.push({
        type: "EXPIRY_SOON",
        message: `Lot ${batch.batchNumber} expire dans ${daysUntilExpiry} jours`,
        severity: "warning",
      });
    }
  });

  if (drug.requiresColdChain) {
    const unverifiedColdChain = batches.some(
      (b) => !b.coldChainVerified && !b.isQuarantined
    );
    if (unverifiedColdChain) {
      alerts.push({
        type: "COLD_CHAIN_BREACH",
        message: "Chaîne du froid non vérifiée sur certains lots",
        severity: "warning",
      });
    }
  }

  return {
    drug: {
      id: drug.id,
      code: drug.code,
      name: drug.name,
      genericName: drug.genericName,
      dci: drug.dci,
      form: drug.form,
      category: drug.category,
      dosage: drug.dosage,
      unitOfDispense: drug.unitOfDispense,
      minStockLevel: drug.minStockLevel,
      criticalStockLevel: drug.criticalStockLevel,
      reorderPoint: drug.reorderPoint,
      unitPriceCDF: drug.unitPriceCDF,
      unitPriceUSD: drug.unitPriceUSD,
      isControlled: drug.isControlled,
      requiresColdChain: drug.requiresColdChain,
    },
    totalQuantity,
    batches: batchDetails,
    alerts,
  };
}
