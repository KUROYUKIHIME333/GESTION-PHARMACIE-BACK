import { prisma } from "@/lib/prisma.js";

export interface DashboardStats {
  alerts: {
    totalActive: number;
    critical: number;
    warning: number;
    byType: Record<string, number>;
  };
  stock: {
    totalDrugs: number;
    drugsInStock: number;
    drugsCritical: number;
    drugsLow: number;
    totalValueCDF: number;
    totalValueUSD: number;
  };
  expiries: {
    expired: number;
    critical30Days: number;
    warning90Days: number;
  };
  activity: {
    dispensationsToday: number;
    dispensationsWeek: number;
    prescriptionsToday: number;
    prescriptionsWeek: number;
    newPatientsToday: number;
    newPatientsWeek: number;
  };
  counts: {
    totalPatients: number;
    totalPrescriptions: number;
    totalDispensations: number;
    totalDrugs: number;
    totalBatches: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // ─── Alertes ───────────────────────────────────────────────────────────
  const drugs = await prisma.drug.findMany({
    where: { isActive: true },
    include: {
      batches: {
        where: {
          isActive: true,
          isQuarantined: false,
        },
        select: {
          currentQuantity: true,
          expiryDate: true,
          coldChainVerified: true,
        },
      },
    },
  });

  let criticalStock = 0;
  let lowStock = 0;
  let expired = 0;
  let criticalExpiry = 0;
  let warningExpiry = 0;

  for (const drug of drugs) {
    const totalQuantity = drug.batches
      .filter((b) => b.expiryDate > now)
      .reduce((sum, b) => sum + b.currentQuantity, 0);

    if (
      drug.criticalStockLevel > 0 &&
      totalQuantity <= drug.criticalStockLevel
    ) {
      criticalStock++;
    } else if (drug.minStockLevel > 0 && totalQuantity <= drug.minStockLevel) {
      lowStock++;
    }

    for (const batch of drug.batches) {
      const daysUntilExpiry = Math.ceil(
        (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) {
        expired++;
      } else if (daysUntilExpiry <= 30) {
        criticalExpiry++;
      } else if (daysUntilExpiry <= 90) {
        warningExpiry++;
      }
    }
  }

  // ─── Stock ─────────────────────────────────────────────────────────────
  const allBatches = await prisma.batch.findMany({
    where: {
      isActive: true,
      isQuarantined: false,
      expiryDate: { gt: now },
    },
    include: {
      drug: { select: { unitPriceCDF: true, unitPriceUSD: true } },
    },
  });

  const totalValueCDF = allBatches.reduce(
    (sum, b) =>
      sum +
      (b.drug.unitPriceCDF
        ? b.drug.unitPriceCDF.toNumber() * b.currentQuantity
        : 0),
    0
  );
  const totalValueUSD = allBatches.reduce(
    (sum, b) =>
      sum +
      (b.drug.unitPriceUSD
        ? b.drug.unitPriceUSD.toNumber() * b.currentQuantity
        : 0),
    0
  );

  const drugsInStock = new Set(
    allBatches.filter((b) => b.currentQuantity > 0).map((b) => b.drugId)
  ).size;

  // ─── Activité ────────────────────────────────────────────────────────────
  const dispensationsToday = await prisma.dispensation.count({
    where: { dispensedAt: { gte: todayStart } },
  });
  const dispensationsWeek = await prisma.dispensation.count({
    where: { dispensedAt: { gte: weekStart } },
  });

  const prescriptionsToday = await prisma.prescription.count({
    where: { createdAt: { gte: todayStart } },
  });
  const prescriptionsWeek = await prisma.prescription.count({
    where: { createdAt: { gte: weekStart } },
  });

  const newPatientsToday = await prisma.patient.count({
    where: { createdAt: { gte: todayStart } },
  });
  const newPatientsWeek = await prisma.patient.count({
    where: { createdAt: { gte: weekStart } },
  });

  // ─── Compteurs totaux ────────────────────────────────────────────────────
  const totalPatients = await prisma.patient.count({
    where: { isActive: true },
  });
  const totalPrescriptions = await prisma.prescription.count();
  const totalDispensations = await prisma.dispensation.count();
  const totalDrugs = await prisma.drug.count({ where: { isActive: true } });
  const totalBatches = await prisma.batch.count({ where: { isActive: true } });

  return {
    alerts: {
      totalActive:
        criticalStock + lowStock + expired + criticalExpiry + warningExpiry,
      critical: criticalStock + expired + criticalExpiry,
      warning: lowStock + warningExpiry,
      byType: {
        CRITICAL_STOCK: criticalStock,
        LOW_STOCK: lowStock,
        EXPIRED: expired,
        EXPIRY_SOON: criticalExpiry + warningExpiry,
      },
    },
    stock: {
      totalDrugs: drugs.length,
      drugsInStock,
      drugsCritical: criticalStock,
      drugsLow: lowStock,
      totalValueCDF,
      totalValueUSD,
    },
    expiries: {
      expired,
      critical30Days: criticalExpiry,
      warning90Days: warningExpiry,
    },
    activity: {
      dispensationsToday,
      dispensationsWeek,
      prescriptionsToday,
      prescriptionsWeek,
      newPatientsToday,
      newPatientsWeek,
    },
    counts: {
      totalPatients,
      totalPrescriptions,
      totalDispensations,
      totalDrugs,
      totalBatches,
    },
  };
}
