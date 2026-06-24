import { prisma } from "@/lib/prisma.js";
import { AppError } from "../../lib/error.js";
import {
  DispensationCreateInput,
  DispensationQueryInput,
} from "./dispensation.schemas.js";
import {
  Prisma,
  MovementType,
  PrescriptionStatus,
  AllergySeverity,
} from "../../prisma/generated/prisma/client.js";

export interface DispensationListResult {
  dispensations: Array<{
    id: string;
    dispensationNumber: string;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      hospitalNumber: string;
    };
    prescription: { id: string; prescriptionNumber: string } | null;
    dispensedBy: { id: string; firstName: string; lastName: string };
    dispensedAt: Date;
    paymentMethod: string;
    totalAmountCDF: Prisma.Decimal | null;
    totalAmountUSD: Prisma.Decimal | null;
    lineCount: number;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FEFOLotSelection {
  batchId: string;
  batchNumber: string;
  quantityTaken: number;
  unitPriceCDF: Prisma.Decimal | null;
  unitPriceUSD: Prisma.Decimal | null;
}

interface AllergyCheckResult {
  hasAnaphylaxis: boolean;
  hasSevere: boolean;
  allergies: Array<{
    substance: string;
    severity: AllergySeverity;
    reaction: string | null;
  }>;
}

function generateDispensationNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `DIS-${year}-${random}`;
}

async function checkPatientAllergies(
  patientId: string,
  drugIds: string[]
): Promise<AllergyCheckResult> {
  const allergies = await prisma.patientAllergy.findMany({
    where: {
      patientId,
      severity: { in: [AllergySeverity.SEVERE, AllergySeverity.ANAPHYLAXIS] },
    },
  });

  // Vérifier si les substances allergiques correspondent aux médicaments dispensés
  // En MVP, on fait une vérification simple par nom/DCI
  const drugs = await prisma.drug.findMany({
    where: { id: { in: drugIds } },
    select: { id: true, name: true, dci: true, genericName: true },
  });

  const matchedAllergies: AllergyCheckResult["allergies"] = [];

  for (const allergy of allergies) {
    const substance = allergy.substance.toLowerCase();
    for (const drug of drugs) {
      const drugName = drug.name.toLowerCase();
      const drugDci = drug.dci.toLowerCase();
      const genericName = drug.genericName?.toLowerCase() ?? "";

      if (
        drugName.includes(substance) ||
        drugDci.includes(substance) ||
        genericName.includes(substance) ||
        substance.includes(drugName) ||
        substance.includes(drugDci)
      ) {
        matchedAllergies.push({
          substance: allergy.substance,
          severity: allergy.severity,
          reaction: allergy.reaction,
        });
        break;
      }
    }
  }

  return {
    hasAnaphylaxis: matchedAllergies.some(
      (a) => a.severity === AllergySeverity.ANAPHYLAXIS
    ),
    hasSevere: matchedAllergies.some(
      (a) => a.severity === AllergySeverity.SEVERE
    ),
    allergies: matchedAllergies,
  };
}

async function selectFEFOLots(
  drugId: string,
  quantityNeeded: number
): Promise<FEFOLotSelection[]> {
  const now = new Date();

  const availableBatches = await prisma.batch.findMany({
    where: {
      drugId,
      isActive: true,
      isQuarantined: false,
      expiryDate: { gt: now },
      currentQuantity: { gt: 0 },
    },
    orderBy: { expiryDate: "asc" },
  });

  if (availableBatches.length === 0) {
    throw AppError.validation(`Aucun lot disponible pour ce médicament`);
  }

  const totalAvailable = availableBatches.reduce(
    (sum, b) => sum + b.currentQuantity,
    0
  );
  if (totalAvailable < quantityNeeded) {
    throw AppError.validation(
      `Stock insuffisant. Demandé : ${quantityNeeded}, Disponible : ${totalAvailable}`
    );
  }

  const selections: FEFOLotSelection[] = [];
  let remaining = quantityNeeded;

  for (const batch of availableBatches) {
    if (remaining <= 0) break;

    const take = Math.min(batch.currentQuantity, remaining);
    selections.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      quantityTaken: take,
      unitPriceCDF: batch.purchasePriceCDF,
      unitPriceUSD: batch.purchasePriceUSD,
    });
    remaining -= take;
  }

  return selections;
}

export async function createDispensation(
  input: DispensationCreateInput,
  dispensedById: string
) {
  // ─── 1. Vérifier le patient ───────────────────────────────────────────────
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    include: { allergies: true },
  });

  if (!patient) {
    throw AppError.notFound("Patient", input.patientId);
  }

  if (!patient.isActive) {
    throw AppError.validation("Le patient est inactif");
  }

  // ─── 2. Vérifier l'ordonnance si fournie ──────────────────────────────────
  let prescription = null;
  if (input.prescriptionId) {
    prescription = await prisma.prescription.findUnique({
      where: { id: input.prescriptionId },
      include: {
        lines: {
          include: {
            drug: { select: { id: true, name: true, dci: true } },
          },
        },
      },
    });

    if (!prescription) {
      throw AppError.notFound("Ordonnance", input.prescriptionId);
    }

    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw AppError.validation("L'ordonnance est annulée");
    }

    if (prescription.status === PrescriptionStatus.EXPIRED) {
      throw AppError.validation("L'ordonnance a expiré");
    }

    if (prescription.status === PrescriptionStatus.DISPENSED) {
      throw AppError.validation("L'ordonnance est déjà entièrement dispensée");
    }

    if (prescription.patientId !== input.patientId) {
      throw AppError.validation("L'ordonnance ne correspond pas au patient");
    }
  }

  // ─── 3. Vérifier les allergies ────────────────────────────────────────────
  const drugIds = input.lines.map((l) => l.drugId);
  const allergyCheck = await checkPatientAllergies(input.patientId, drugIds);

  if (allergyCheck.hasAnaphylaxis) {
    throw AppError.validation(
      `DISPENSATION BLOQUÉE - Allergie ANAPHYLAXIE détectée : ${allergyCheck.allergies
        .filter((a) => a.severity === AllergySeverity.ANAPHYLAXIS)
        .map(
          (a) => `${a.substance} (${a.reaction ?? "réaction non spécifiée"})`
        )
        .join(", ")}`
    );
  }

  // ─── 4. Préparer la sélection FEFO pour chaque ligne ──────────────────────
  const lineSelections: Array<{
    inputLine: typeof input.lines[0];
    fefoLots: FEFOLotSelection[];
    drug: {
      id: string;
      name: string;
      code: string;
      unitPriceCDF: Prisma.Decimal | null;
      unitPriceUSD: Prisma.Decimal | null;
      isControlled: boolean;
    };
  }> = [];

  for (const line of input.lines) {
    const drug = await prisma.drug.findUnique({
      where: { id: line.drugId },
    });

    if (!drug) {
      throw AppError.notFound("Médicament", line.drugId);
    }

    if (!drug.isActive) {
      throw AppError.validation(`Le médicament ${drug.name} n'est pas actif`);
    }

    // Vérifier si la ligne correspond à une ligne d'ordonnance
    if (line.prescriptionLineId && prescription) {
      const prescripLine = prescription.lines.find(
        (l) => l.id === line.prescriptionLineId
      );
      if (!prescripLine) {
        throw AppError.validation("Ligne d'ordonnance introuvable");
      }
      if (prescripLine.drugId !== line.drugId) {
        throw AppError.validation(
          "Le médicament ne correspond pas à la ligne d'ordonnance"
        );
      }
      const remaining =
        prescripLine.quantityPrescribed - prescripLine.quantityDispensed;
      if (line.quantity > remaining) {
        throw AppError.validation(
          `Quantité demandée (${line.quantity}) supérieure au reste à dispenser (${remaining})`
        );
      }
    }

    const fefoLots = await selectFEFOLots(line.drugId, line.quantity);

    lineSelections.push({
      inputLine: line,
      fefoLots,
      drug,
    });
  }

  // ─── 5. Transaction atomique ──────────────────────────────────────────────
  const dispensation = await prisma.$transaction(
    async (tx) => {
      if (!input.prescriptionId) {
        const allowWithoutRx = await tx.systemConfig.findUnique({
          where: { key: "dispensation.allowWithoutRx" },
        });

        if (allowWithoutRx?.value === "false") {
          throw AppError.validation(
            "Dispensation sans ordonnance non autorisée"
          );
        }
      }
      // Créer la dispensation
      const newDispensation = await tx.dispensation.create({
        data: {
          dispensationNumber: generateDispensationNumber(),
          patientId: input.patientId,
          prescriptionId: input.prescriptionId ?? null,
          dispensedById,
          dispensedAt: new Date(),
          allergyCheckDone: true,
          interactionCheckDone: false, // MVP : table DrugInteraction vide
          paymentMethod: input.paymentMethod,
          totalAmountCDF: input.totalAmountCDF
            ? new Prisma.Decimal(input.totalAmountCDF)
            : null,
          totalAmountUSD: input.totalAmountUSD
            ? new Prisma.Decimal(input.totalAmountUSD)
            : null,
          amountPaidCDF: input.amountPaidCDF
            ? new Prisma.Decimal(input.amountPaidCDF)
            : null,
          amountPaidUSD: input.amountPaidUSD
            ? new Prisma.Decimal(input.amountPaidUSD)
            : null,
          insuranceCoverage: input.insuranceCoverage
            ? new Prisma.Decimal(input.insuranceCoverage)
            : null,
          receiptNumber: input.receiptNumber,
          notes: input.notes,
        },
      });

      // Créer les lignes de dispensation et mouvements de stock
      for (const { inputLine, fefoLots, drug } of lineSelections) {
        for (const lot of fefoLots) {
          // Créer la DispensationLine
          const dispensationLine = await tx.dispensationLine.create({
            data: {
              dispensationId: newDispensation.id,
              batchId: lot.batchId,
              drugId: inputLine.drugId,
              quantity: lot.quantityTaken,
              unitPriceCDF: drug.unitPriceCDF,
              unitPriceUSD: drug.unitPriceUSD,
              totalPriceCDF: drug.unitPriceCDF
                ? new Prisma.Decimal(
                    drug.unitPriceCDF.toNumber() * lot.quantityTaken
                  )
                : null,
              totalPriceUSD: drug.unitPriceUSD
                ? new Prisma.Decimal(
                    drug.unitPriceUSD.toNumber() * lot.quantityTaken
                  )
                : null,
            },
          });

          // Récupérer le batch pour le stock avant
          const batch = await tx.batch.findUnique({
            where: { id: lot.batchId },
          });

          if (!batch) {
            throw AppError.notFound("Lot", lot.batchId);
          }

          const quantityBefore = batch.currentQuantity;
          const quantityAfter = quantityBefore - lot.quantityTaken;

          // Créer le StockMovement
          await tx.stockMovement.create({
            data: {
              batchId: lot.batchId,
              type: MovementType.DISPENSATION_OUT,
              quantity: -lot.quantityTaken,
              quantityBefore,
              quantityAfter,
              dispensationLineId: dispensationLine.id,
              createdById: dispensedById,
              reason: `Dispensation ${newDispensation.dispensationNumber}`,
            },
          });

          // Mettre à jour le stock du lot
          await tx.batch.update({
            where: { id: lot.batchId },
            data: { currentQuantity: quantityAfter },
          });

          // Si lot lié à une ligne d'ordonnance, mettre à jour
          if (inputLine.prescriptionLineId) {
            const prescripLine = await tx.prescriptionLine.findUnique({
              where: { id: inputLine.prescriptionLineId },
            });

            if (prescripLine) {
              const newDispensed =
                prescripLine.quantityDispensed + lot.quantityTaken;
              const isFulfilled =
                newDispensed >= prescripLine.quantityPrescribed;

              await tx.prescriptionLine.update({
                where: { id: inputLine.prescriptionLineId },
                data: {
                  quantityDispensed: newDispensed,
                  isFulfilled,
                },
              });
            }
          }
        }

        // Si stupéfiant, créer l'entrée dans le registre (champ en base pour V2)
        if (drug.isControlled) {
          const totalQuantity = fefoLots.reduce(
            (sum, l) => sum + l.quantityTaken,
            0
          );
          const firstLot = fefoLots[0];
          const batch = await tx.batch.findUnique({
            where: { id: firstLot.batchId },
          });

          if (batch) {
            await tx.controlledDrugEntry.create({
              data: {
                drugId: drug.id,
                batchId: firstLot.batchId,
                movementType: MovementType.DISPENSATION_OUT,
                quantity: -totalQuantity,
                balanceBefore: batch.currentQuantity + totalQuantity, // Avant la dispensation
                balanceAfter: batch.currentQuantity,
                patientName: `${patient.firstName} ${patient.lastName}`,
                patientId: patient.id,
                prescriptionRef: prescription?.prescriptionNumber ?? null,
                signedById: dispensedById,
                entryDate: new Date(),
                notes: `Dispensation ${newDispensation.dispensationNumber}`,
              },
            });
          }
        }
      }

      // Mettre à jour le statut de l'ordonnance
      if (prescription) {
        const allLines = await tx.prescriptionLine.findMany({
          where: { prescriptionId: prescription.id },
        });

        const allFulfilled = allLines.every((l) => l.isFulfilled);
        const someDispensed = allLines.some((l) => l.quantityDispensed > 0);

        let newStatus: PrescriptionStatus;
        if (allFulfilled) {
          newStatus = PrescriptionStatus.DISPENSED;
        } else if (someDispensed) {
          newStatus = PrescriptionStatus.PARTIALLY_DISPENSED;
        } else {
          newStatus = PrescriptionStatus.PENDING;
        }

        if (newStatus !== prescription.status) {
          await tx.prescription.update({
            where: { id: prescription.id },
            data: { status: newStatus },
          });
        }
      }

      return newDispensation;
    },
    {
      maxWait: 5000,
      timeout: 10000,
    }
  );

  // Retourner la dispensation avec toutes les relations
  return prisma.dispensation.findUnique({
    where: { id: dispensation.id },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          hospitalNumber: true,
        },
      },
      prescription: { select: { id: true, prescriptionNumber: true } },
      dispensedBy: { select: { id: true, firstName: true, lastName: true } },
      lines: {
        include: {
          drug: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, batchNumber: true, expiryDate: true } },
        },
      },
    },
  });
}

export async function listDispensations(
  query: DispensationQueryInput
): Promise<DispensationListResult> {
  const { patientId, prescriptionId, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.DispensationWhereInput = {};

  if (patientId) where.patientId = patientId;
  if (prescriptionId) where.prescriptionId = prescriptionId;

  const [dispensations, total] = await Promise.all([
    prisma.dispensation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            hospitalNumber: true,
          },
        },
        prescription: { select: { id: true, prescriptionNumber: true } },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.dispensation.count({ where }),
  ]);

  return {
    dispensations: dispensations.map((d) => ({
      id: d.id,
      dispensationNumber: d.dispensationNumber,
      patient: d.patient,
      prescription: d.prescription,
      dispensedBy: d.dispensedBy,
      dispensedAt: d.dispensedAt,
      paymentMethod: d.paymentMethod,
      totalAmountCDF: d.totalAmountCDF,
      totalAmountUSD: d.totalAmountUSD,
      lineCount: d._count.lines,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDispensationById(id: string) {
  const dispensation = await prisma.dispensation.findUnique({
    where: { id },
    include: {
      patient: {
        include: {
          allergies: true,
        },
      },
      prescription: {
        include: {
          lines: {
            include: {
              drug: { select: { id: true, name: true, code: true } },
            },
          },
        },
      },
      dispensedBy: { select: { id: true, firstName: true, lastName: true } },
      lines: {
        include: {
          drug: {
            select: {
              id: true,
              name: true,
              code: true,
              dci: true,
              unitOfDispense: true,
            },
          },
          batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          stockMovements: {
            select: {
              id: true,
              quantity: true,
              quantityBefore: true,
              quantityAfter: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!dispensation) {
    throw AppError.notFound("Dispensation", id);
  }

  return dispensation;
}
