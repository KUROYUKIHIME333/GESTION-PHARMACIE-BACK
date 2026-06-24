import { prisma } from "@/lib/prisma.js";
import { AppError } from "../../lib/error.js";
import {
  PrescriptionCreateInput,
  PrescriptionLineCreateInput,
  PrescriptionStatusUpdateInput,
  PrescriptionQueryInput,
} from "./prescription.schemas.js";
import {
  Prisma,
  PrescriptionStatus,
} from "@/prisma/generated/prisma/client.js";

export interface PrescriptionListResult {
  prescriptions: Array<{
    id: string;
    prescriptionNumber: string;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      hospitalNumber: string;
    };
    prescribedBy: { id: string; firstName: string; lastName: string };
    status: PrescriptionStatus;
    visitDate: Date;
    validUntil: Date | null;
    lineCount: number;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function generatePrescriptionNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `ORD-${year}-${random}`;
}

export async function listPrescriptions(
  query: PrescriptionQueryInput
): Promise<PrescriptionListResult> {
  const { patientId, status, prescribedById, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.PrescriptionWhereInput = {};

  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  if (prescribedById) where.prescribedById = prescribedById;

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
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
        prescribedBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.prescription.count({ where }),
  ]);

  return {
    prescriptions: prescriptions.map((p) => ({
      id: p.id,
      prescriptionNumber: p.prescriptionNumber,
      patient: p.patient,
      prescribedBy: p.prescribedBy,
      status: p.status,
      visitDate: p.visitDate,
      validUntil: p.validUntil,
      lineCount: p._count.lines,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPrescriptionById(id: string) {
  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      patient: {
        include: {
          allergies: true,
          insurance: true,
        },
      },
      prescribedBy: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
      service: true,
      lines: {
        orderBy: { lineNumber: "asc" },
        include: {
          drug: {
            select: {
              id: true,
              name: true,
              code: true,
              dci: true,
              form: true,
              dosage: true,
            },
          },
        },
      },
      dispensations: {
        orderBy: { createdAt: "desc" },
        include: {
          dispensedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          lines: {
            include: {
              drug: { select: { id: true, name: true, code: true } },
              batch: { select: { id: true, batchNumber: true } },
            },
          },
        },
      },
    },
  });

  if (!prescription) {
    throw AppError.notFound("Ordonnance", id);
  }

  return prescription;
}

export async function createPrescription(
  input: PrescriptionCreateInput,
  currentUserId: string
) {
  // Vérifier le patient
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
  });
  if (!patient) {
    throw AppError.notFound("Patient", input.patientId);
  }

  // Si prescribedById non fourni, utiliser l'utilisateur courant
  const prescribedById = input.prescribedById ?? currentUserId;

  // Vérifier le prescripteur
  const prescriber = await prisma.user.findUnique({
    where: { id: prescribedById },
  });
  if (!prescriber) {
    throw AppError.notFound("Prescripteur", prescribedById);
  }

  // Vérifier le service si fourni
  if (input.serviceId) {
    const service = await prisma.hospitalService.findUnique({
      where: { id: input.serviceId },
    });
    if (!service) {
      throw AppError.notFound("Service hospitalier", input.serviceId);
    }
  }

  // Calculer la date de validité (3 jours par défaut)
  const validityConfig = await prisma.systemConfig.findUnique({
    where: { key: "prescription.validityDays" },
  });
  const validityDays = validityConfig ? parseInt(validityConfig.value, 10) : 3;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  const prescription = await prisma.prescription.create({
    data: {
      prescriptionNumber: generatePrescriptionNumber(),
      patientId: input.patientId,
      prescribedById,
      serviceId: input.serviceId,
      isInpatient: input.isInpatient,
      admissionRef: input.admissionRef,
      validUntil,
      status: PrescriptionStatus.PENDING,
      diagnosisCode: input.diagnosisCode,
      diagnosisLabel: input.diagnosisLabel,
      notes: input.notes,
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          hospitalNumber: true,
        },
      },
      prescribedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return prescription;
}

export async function addPrescriptionLine(
  prescriptionId: string,
  input: PrescriptionLineCreateInput
) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: { lines: true },
  });

  if (!prescription) {
    throw AppError.notFound("Ordonnance", prescriptionId);
  }

  if (
    prescription.status !== PrescriptionStatus.DRAFT &&
    prescription.status !== PrescriptionStatus.PENDING
  ) {
    throw AppError.validation(
      "Impossible d'ajouter une ligne à une ordonnance qui n'est pas en brouillon ou en attente"
    );
  }

  // Vérifier le médicament
  const drug = await prisma.drug.findUnique({
    where: { id: input.drugId },
  });
  if (!drug) {
    throw AppError.notFound("Médicament", input.drugId);
  }

  if (!drug.isActive) {
    throw AppError.validation("Ce médicament n'est pas actif");
  }

  // Calculer le numéro de ligne
  const lineNumber =
    prescription.lines.length > 0
      ? Math.max(...prescription.lines.map((l) => l.lineNumber)) + 1
      : 1;

  const line = await prisma.prescriptionLine.create({
    data: {
      prescriptionId,
      drugId: input.drugId,
      lineNumber,
      quantityPrescribed: input.quantityPrescribed,
      dosage: input.dosage,
      frequency: input.frequency,
      durationDays: input.durationDays,
      route: input.route,
      instructions: input.instructions,
    },
    include: {
      drug: { select: { id: true, name: true, code: true, dci: true } },
    },
  });

  return line;
}

export async function updatePrescriptionStatus(
  prescriptionId: string,
  input: PrescriptionStatusUpdateInput
) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
  });

  if (!prescription) {
    throw AppError.notFound("Ordonnance", prescriptionId);
  }

  // Validation des transitions de statut
  const validTransitions: Record<PrescriptionStatus, PrescriptionStatus[]> = {
    [PrescriptionStatus.DRAFT]: [
      PrescriptionStatus.PENDING,
      PrescriptionStatus.CANCELLED,
    ],
    [PrescriptionStatus.PENDING]: [
      PrescriptionStatus.PARTIALLY_DISPENSED,
      PrescriptionStatus.DISPENSED,
      PrescriptionStatus.CANCELLED,
      PrescriptionStatus.EXPIRED,
    ],
    [PrescriptionStatus.PARTIALLY_DISPENSED]: [
      PrescriptionStatus.DISPENSED,
      PrescriptionStatus.CANCELLED,
    ],
    [PrescriptionStatus.DISPENSED]: [],
    [PrescriptionStatus.CANCELLED]: [],
    [PrescriptionStatus.EXPIRED]: [],
  };

  const allowedNextStatuses = validTransitions[prescription.status] ?? [];
  if (!allowedNextStatuses.includes(input.status)) {
    throw AppError.validation(
      `Transition de statut invalide : ${prescription.status} → ${
        input.status
      }. Transitions autorisées : ${allowedNextStatuses.join(", ") || "aucune"}`
    );
  }

  const updated = await prisma.prescription.update({
    where: { id: prescriptionId },
    data: { status: input.status },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      prescribedBy: { select: { id: true, firstName: true, lastName: true } },
      lines: {
        include: {
          drug: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });

  return updated;
}
