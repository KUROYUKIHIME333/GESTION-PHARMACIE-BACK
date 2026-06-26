import { prisma } from "@/lib/prisma.js";
import { AppError } from "@/lib/error.js";
import {
  PatientCreateInput,
  PatientUpdateInput,
  PatientQueryInput,
  AllergyCreateInput,
} from "./patient.schemas.js";
import { Prisma } from "@/prisma/generated/prisma/client.js";

export interface PatientListResult {
  patients: Array<{
    id: string;
    hospitalNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    gender: string;
    phone: string | null;
    isActive: boolean;
    _count: { prescriptions: number; dispensations: number };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listPatients(
  query: PatientQueryInput
): Promise<PatientListResult> {
  const { search, gender, isActive, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.PatientWhereInput = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { hospitalNumber: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (gender) where.gender = gender;
  if (isActive !== undefined) where.isActive = isActive;

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { isActive: "desc" },
        { lastName: "asc" },
        { firstName: "asc" },
      ],
      select: {
        id: true,
        hospitalNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        isActive: true,
        _count: {
          select: { prescriptions: true, dispensations: true },
        },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    patients,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPatientById(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      allergies: {
        orderBy: { createdAt: "desc" },
      },
      insurance: true,
      prescriptions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          prescribedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          lines: {
            include: {
              drug: { select: { id: true, name: true, code: true, dci: true } },
            },
          },
        },
      },
      dispensations: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          dispensedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!patient) {
    throw AppError.notFound("Patient", id);
  }

  return patient;
}

export async function createPatient(input: PatientCreateInput) {
  const existingNumber = await prisma.patient.findUnique({
    where: { hospitalNumber: input.hospitalNumber },
  });

  if (existingNumber) {
    throw AppError.conflict(
      `Un patient avec le numéro de dossier "${input.hospitalNumber}" existe déjà`
    );
  }

  const patient = await prisma.patient.create({
    data: {
      hospitalNumber: input.hospitalNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      nationalId: input.nationalId,
      phone: input.phone,
      address: input.address,
      commune: input.commune,
      territoire: input.territoire,
      province: input.province,
      insuranceId: input.insuranceId,
      ongCoverageRef: input.ongCoverageRef,
      isHivPatient: input.isHivPatient,
      arvCode: input.arvCode,
      isTbPatient: input.isTbPatient,
      tbCode: input.tbCode,
      chronicConditions: input.chronicConditions,
      isActive: input.isActive,
      notes: input.notes,
    },
  });

  return patient;
}

export async function updatePatient(id: string, input: PatientUpdateInput) {
  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Patient", id);
  }

  if (
    input.hospitalNumber &&
    input.hospitalNumber !== existing.hospitalNumber
  ) {
    const numberExists = await prisma.patient.findUnique({
      where: { hospitalNumber: input.hospitalNumber },
    });
    if (numberExists) {
      throw AppError.conflict(
        `Un patient avec le numéro de dossier "${input.hospitalNumber}" existe déjà`
      );
    }
  }

  const updateData: Prisma.PatientUpdateInput = { ...input };

  // Nettoyer les undefined
  Object.keys(updateData).forEach((key) => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  const patient = await prisma.patient.update({
    where: { id },
    data: updateData,
  });

  return patient;
}

export async function addPatientAllergy(
  patientId: string,
  input: AllergyCreateInput
) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw AppError.notFound("Patient", patientId);
  }

  const allergy = await prisma.patientAllergy.create({
    data: {
      patientId,
      substance: input.substance,
      reaction: input.reaction,
      severity: input.severity,
      confirmedAt: input.confirmedAt,
      confirmedBy: input.confirmedBy,
      notes: input.notes,
    },
  });

  return allergy;
}

export async function getPatientAllergies(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw AppError.notFound("Patient", patientId);
  }

  const allergies = await prisma.patientAllergy.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });

  return allergies;
}
