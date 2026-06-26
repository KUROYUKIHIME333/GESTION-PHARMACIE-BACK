import { prisma } from "@/lib/prisma.js";
import { AppError } from "@/lib/error.js";
import { AlertAcknowledgeInput, AlertQueryInput } from "./alert.schemas.js";
import {
  AlertStatus,
  AlertType,
} from "../../prisma/generated/prisma/client.js";

export interface AlertItem {
  id: string;
  type: AlertType;
  status: AlertStatus;
  drugId: string;
  drugName: string;
  drugCode: string;
  batchId: string | null;
  batchNumber: string | null;
  message: string;
  threshold: number | null;
  currentValue: number | null;
  severity: "critical" | "warning" | "info";
  createdAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface AlertListResult {
  alerts: AlertItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    critical: number;
    warning: number;
    info: number;
    byType: Record<string, number>;
  };
}

export async function getAlerts(
  query: AlertQueryInput
): Promise<AlertListResult> {
  const now = new Date();
  const warningDays = 90;
  const criticalDays = 30;

  // ─── 1. Alertes stock bas / critique ──────────────────────────────────────
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
          batchNumber: true,
          currentQuantity: true,
          expiryDate: true,
          coldChainVerified: true,
        },
      },
    },
  });

  const alerts: AlertItem[] = [];

  for (const drug of drugs) {
    const totalQuantity = drug.batches.reduce(
      (sum, b) => sum + b.currentQuantity,
      0
    );

    // Stock critique
    if (
      drug.criticalStockLevel > 0 &&
      totalQuantity <= drug.criticalStockLevel
    ) {
      alerts.push({
        id: `stock-critical-${drug.id}`,
        type: AlertType.CRITICAL_STOCK,
        status: AlertStatus.ACTIVE,
        drugId: drug.id,
        drugName: drug.name,
        drugCode: drug.code,
        batchId: null,
        batchNumber: null,
        message: `${drug.name} : stock critique à ${totalQuantity} unités (seuil : ${drug.criticalStockLevel})`,
        threshold: drug.criticalStockLevel,
        currentValue: totalQuantity,
        severity: "critical",
        createdAt: now,
        acknowledgedAt: null,
        acknowledgedBy: null,
      });
    }
    // Stock bas (mais pas critique)
    else if (drug.minStockLevel > 0 && totalQuantity <= drug.minStockLevel) {
      alerts.push({
        id: `stock-low-${drug.id}`,
        type: AlertType.LOW_STOCK,
        status: AlertStatus.ACTIVE,
        drugId: drug.id,
        drugName: drug.name,
        drugCode: drug.code,
        batchId: null,
        batchNumber: null,
        message: `${drug.name} : stock bas à ${totalQuantity} unités (seuil : ${drug.minStockLevel})`,
        threshold: drug.minStockLevel,
        currentValue: totalQuantity,
        severity: "warning",
        createdAt: now,
        acknowledgedAt: null,
        acknowledgedBy: null,
      });
    }

    // Péremptions par lot
    for (const batch of drug.batches) {
      const daysUntilExpiry = Math.ceil(
        (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) {
        alerts.push({
          id: `expired-${batch.id}`,
          type: AlertType.EXPIRED,
          status: AlertStatus.ACTIVE,
          drugId: drug.id,
          drugName: drug.name,
          drugCode: drug.code,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          message: `Lot ${batch.batchNumber} de ${
            drug.name
          } périmé depuis ${Math.abs(daysUntilExpiry)} jours`,
          threshold: 0,
          currentValue: daysUntilExpiry,
          severity: "critical",
          createdAt: now,
          acknowledgedAt: null,
          acknowledgedBy: null,
        });
      } else if (daysUntilExpiry <= criticalDays) {
        alerts.push({
          id: `expiry-critical-${batch.id}`,
          type: AlertType.EXPIRY_SOON,
          status: AlertStatus.ACTIVE,
          drugId: drug.id,
          drugName: drug.name,
          drugCode: drug.code,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          message: `Lot ${batch.batchNumber} de ${drug.name} expire dans ${daysUntilExpiry} jours`,
          threshold: criticalDays,
          currentValue: daysUntilExpiry,
          severity: "critical",
          createdAt: now,
          acknowledgedAt: null,
          acknowledgedBy: null,
        });
      } else if (daysUntilExpiry <= warningDays) {
        alerts.push({
          id: `expiry-warning-${batch.id}`,
          type: AlertType.EXPIRY_SOON,
          status: AlertStatus.ACTIVE,
          drugId: drug.id,
          drugName: drug.name,
          drugCode: drug.code,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          message: `Lot ${batch.batchNumber} de ${drug.name} expire dans ${daysUntilExpiry} jours`,
          threshold: warningDays,
          currentValue: daysUntilExpiry,
          severity: "warning",
          createdAt: now,
          acknowledgedAt: null,
          acknowledgedBy: null,
        });
      }

      // Chaîne du froid
      if (drug.requiresColdChain && !batch.coldChainVerified) {
        alerts.push({
          id: `coldchain-${batch.id}`,
          type: AlertType.COLD_CHAIN_BREACH,
          status: AlertStatus.ACTIVE,
          drugId: drug.id,
          drugName: drug.name,
          drugCode: drug.code,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          message: `Chaîne du froid non vérifiée pour le lot ${batch.batchNumber} de ${drug.name}`,
          threshold: null,
          currentValue: null,
          severity: "warning",
          createdAt: now,
          acknowledgedAt: null,
          acknowledgedBy: null,
        });
      }
    }
  }

  // ─── 2. Filtrer selon les paramètres ────────────────────────────────────────
  let filteredAlerts = alerts;

  if (query.type) {
    filteredAlerts = filteredAlerts.filter((a) => a.type === query.type);
  }

  if (query.status) {
    filteredAlerts = filteredAlerts.filter((a) => a.status === query.status);
  }

  if (query.drugId) {
    filteredAlerts = filteredAlerts.filter((a) => a.drugId === query.drugId);
  }

  // ─── 3. Trier par sévérité puis date ────────────────────────────────────────
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  filteredAlerts.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // ─── 4. Pagination ──────────────────────────────────────────────────────────
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const paginatedAlerts = filteredAlerts.slice(skip, skip + limit);
  const total = filteredAlerts.length;

  // ─── 5. Résumé ──────────────────────────────────────────────────────────────
  const summary = {
    critical: filteredAlerts.filter((a) => a.severity === "critical").length,
    warning: filteredAlerts.filter((a) => a.severity === "warning").length,
    info: filteredAlerts.filter((a) => a.severity === "info").length,
    byType: filteredAlerts.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return {
    alerts: paginatedAlerts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary,
  };
}

export async function acknowledgeAlert(
  alertId: string,
  input: AlertAcknowledgeInput,
  userId: string
) {
  // En MVP, les alertes sont calculées à la volée.
  // On stocke l'acquittement dans StockAlert pour traçabilité.
  // L'alertId est au format "type-uuid", on extrait le drugId/batchId.

  const parts = alertId.split("-");
  if (parts.length < 2) {
    throw AppError.validation("Format d'alerte invalide");
  }

  const type = parts[0];
  const entityId = parts.slice(1).join("-");

  // Déterminer si c'est un alerte drug ou batch
  let drugId: string | null = null;
  let batchId: string | null = null;

  if (type === "stock-critical" || type === "stock-low") {
    drugId = entityId;
  } else {
    // Vérifier si c'est un batchId valide
    const batch = await prisma.batch.findUnique({ where: { id: entityId } });
    if (batch) {
      batchId = entityId;
      drugId = batch.drugId;
    } else {
      // C'est peut-être un drugId
      const drug = await prisma.drug.findUnique({ where: { id: entityId } });
      if (drug) {
        drugId = entityId;
      }
    }
  }

  if (!drugId) {
    throw AppError.notFound("Alerte", alertId);
  }

  // Créer l'alerte en base si elle n'existe pas (pour pouvoir l'acquitter)
  const alert = await prisma.stockAlert.upsert({
    where: { id: alertId },
    update: {
      status: input.status,
    },
    create: {
      id: alertId,
      drugId,
      batchId,
      type: type as AlertType,
      status: input.status,
      message: `Alerte acquittée manuellement`,
    },
  });

  // Créer l'acquittement
  const acknowledgement = await prisma.alertAcknowledgement.create({
    data: {
      alertId: alert.id,
      userId,
      comment: input.comment,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return {
    alert,
    acknowledgement,
  };
}
