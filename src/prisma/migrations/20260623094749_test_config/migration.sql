-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'PHARMACIST', 'PHARMACY_TECH', 'DOCTOR', 'NURSE', 'CASHIER', 'STOCK_MANAGER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DrugForm" AS ENUM ('TABLET', 'CAPSULE', 'SYRUP', 'INJECTABLE_IV', 'INJECTABLE_IM', 'INJECTABLE_SC', 'CREAM', 'OINTMENT', 'DROPS_EYE', 'DROPS_EAR', 'DROPS_NASAL', 'SUPPOSITORY', 'PATCH', 'POWDER', 'GRANULES', 'SOLUTION', 'SUSPENSION', 'AEROSOL', 'GEL', 'PESSARY', 'OTHER');

-- CreateEnum
CREATE TYPE "DrugCategory" AS ENUM ('ANTIRETROVIRAL', 'ANTIMALARIAL', 'ANTITUBERCULOSIS', 'VACCINE', 'ANTIBIOTIC', 'ANALGESIC', 'ANTIPYRETIC', 'ANTI_INFLAMMATORY', 'ANTIFUNGAL', 'ANTIPARASITIC', 'CARDIOVASCULAR', 'ANTIHYPERTENSIVE', 'ANTIDIABETIC', 'RESPIRATORY', 'GASTROINTESTINAL', 'NEUROLOGICAL', 'PSYCHIATRIC', 'HORMONAL', 'CONTRACEPTIVE', 'VITAMINS_SUPPLEMENTS', 'ANESTHETIC', 'ANTISEPTIC_DISINFECTANT', 'MEDICAL_CONSUMABLE', 'DIAGNOSTIC_REAGENT', 'OTHER');

-- CreateEnum
CREATE TYPE "StorageCondition" AS ENUM ('ROOM_TEMP', 'COOL', 'REFRIGERATED', 'FROZEN', 'PROTECT_LIGHT', 'PROTECT_HUMIDITY', 'CONTROLLED_SUBSTANCE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RECEPTION', 'DONATION_IN', 'TRANSFER_IN', 'DISPENSATION_OUT', 'INTERNAL_USE', 'TRANSFER_OUT', 'DONATION_OUT', 'EXPIRY_REMOVAL', 'LOSS', 'INVENTORY_POSITIVE', 'INVENTORY_NEGATIVE', 'RETURN_TO_SUPPLIER', 'RETURN_FROM_PATIENT');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'DISPUTE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_CDF', 'CASH_USD', 'MOBILE_MONEY', 'INSURANCE', 'ONG_COVERAGE', 'CREDIT', 'FREE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_STOCK', 'CRITICAL_STOCK', 'EXPIRY_SOON', 'EXPIRED', 'COLD_CHAIN_BREACH', 'CONTROLLED_REORDER', 'INVENTORY_DISCREPANCY', 'LICENSE_EXPIRY');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'ANAPHYLAXIS');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('WHOLESALER', 'MANUFACTURER', 'NGO', 'STATE_PROGRAM', 'IMPORTER', 'LOCAL_PHARMACY');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('STATE', 'MUTUAL', 'PRIVATE', 'NGO', 'SELF_PAY');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "serviceId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "floor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drugs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "dci" TEXT NOT NULL,
    "form" "DrugForm" NOT NULL,
    "category" "DrugCategory" NOT NULL,
    "therapeuticClass" TEXT,
    "dosage" TEXT NOT NULL,
    "concentration" TEXT,
    "unitOfDispense" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL DEFAULT 1,
    "packUnit" TEXT NOT NULL DEFAULT 'boîte',
    "ammNumber" TEXT,
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    "isControlled" BOOLEAN NOT NULL DEFAULT false,
    "controlledSchedule" TEXT,
    "isProgramDrug" BOOLEAN NOT NULL DEFAULT false,
    "programName" TEXT,
    "storageConditions" "StorageCondition"[],
    "requiresColdChain" BOOLEAN NOT NULL DEFAULT false,
    "minTemp" DOUBLE PRECISION,
    "maxTemp" DOUBLE PRECISION,
    "unitPriceCDF" DECIMAL(12,2),
    "unitPriceUSD" DECIMAL(10,4),
    "isPriceRegulated" BOOLEAN NOT NULL DEFAULT false,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "criticalStockLevel" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_substitutes" (
    "id" TEXT NOT NULL,
    "drugAId" TEXT NOT NULL,
    "drugBId" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_substitutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_interactions" (
    "id" TEXT NOT NULL,
    "drugAId" TEXT NOT NULL,
    "drugBId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'RDC',
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "paymentTermsDays" INTEGER,
    "currencyPreference" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "supplierId" TEXT,
    "purchaseOrderId" TEXT,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "manufacturingDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasePriceCDF" DECIMAL(12,2),
    "purchasePriceUSD" DECIMAL(10,4),
    "locationId" TEXT,
    "coldChainVerified" BOOLEAN NOT NULL DEFAULT false,
    "isQuarantined" BOOLEAN NOT NULL DEFAULT false,
    "quarantineReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_locations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "zone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cold_chain_logs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,
    "isAlert" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "cold_chain_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "dispensationLineId" TEXT,
    "purchaseOrderId" TEXT,
    "inventoryId" TEXT,
    "internalUsageId" TEXT,
    "transferOrderId" TEXT,
    "donationRef" TEXT,
    "reason" TEXT,
    "referenceDoc" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "hospitalNumber" TEXT NOT NULL,
    "externalId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "nationalId" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "commune" TEXT,
    "territoire" TEXT,
    "province" TEXT,
    "insuranceId" TEXT,
    "ongCoverageRef" TEXT,
    "isHivPatient" BOOLEAN,
    "arvCode" TEXT,
    "isTbPatient" BOOLEAN,
    "tbCode" TEXT,
    "chronicConditions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_allergies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "AllergySeverity" NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurances" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InsuranceType" NOT NULL,
    "coverageRate" DECIMAL(5,2),
    "contactInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "prescriptionNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescribedById" TEXT NOT NULL,
    "serviceId" TEXT,
    "isInpatient" BOOLEAN NOT NULL DEFAULT false,
    "admissionRef" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "diagnosisCode" TEXT,
    "diagnosisLabel" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_lines" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "quantityPrescribed" INTEGER NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT,
    "durationDays" INTEGER,
    "route" TEXT,
    "instructions" TEXT,
    "quantityDispensed" INTEGER NOT NULL DEFAULT 0,
    "isFulfilled" BOOLEAN NOT NULL DEFAULT false,
    "substituteUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensations" (
    "id" TEXT NOT NULL,
    "dispensationNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "dispensedById" TEXT NOT NULL,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "allergyCheckDone" BOOLEAN NOT NULL DEFAULT false,
    "interactionCheckDone" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "totalAmountCDF" DECIMAL(12,2),
    "totalAmountUSD" DECIMAL(10,4),
    "amountPaidCDF" DECIMAL(12,2),
    "amountPaidUSD" DECIMAL(10,4),
    "insuranceCoverage" DECIMAL(12,2),
    "receiptNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensation_lines" (
    "id" TEXT NOT NULL,
    "dispensationId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCDF" DECIMAL(12,2),
    "unitPriceUSD" DECIMAL(10,4),
    "totalPriceCDF" DECIMAL(12,2),
    "totalPriceUSD" DECIMAL(10,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispensation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_usages" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" TEXT NOT NULL,
    "referenceDoc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_usage_lines" (
    "id" TEXT NOT NULL,
    "internalUsageId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_usage_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_orders" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromServiceId" TEXT NOT NULL,
    "toServiceId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order_lines" (
    "id" TEXT NOT NULL,
    "transferOrderId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantityTransferred" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controlled_drug_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" SERIAL NOT NULL,
    "drugId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "patientName" TEXT,
    "patientId" TEXT,
    "prescriberName" TEXT,
    "prescriptionRef" TEXT,
    "signedById" TEXT NOT NULL,
    "counterSignedById" TEXT,
    "counterSignedAt" TIMESTAMP(3),
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "controlled_drug_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "totalAmountUSD" DECIMAL(12,4),
    "totalAmountCDF" DECIMAL(14,2),
    "invoiceRef" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitPriceUSD" DECIMAL(10,4),
    "unitPriceCDF" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_inventories" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "conductedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physical_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_lines" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "theoreticalQty" INTEGER NOT NULL,
    "countedQty" INTEGER NOT NULL,
    "discrepancy" INTEGER NOT NULL,
    "discrepancyNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "batchId" TEXT,
    "type" "AlertType" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "message" TEXT NOT NULL,
    "threshold" INTEGER,
    "currentValue" INTEGER,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_acknowledgements" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_services_code_key" ON "hospital_services"("code");

-- CreateIndex
CREATE UNIQUE INDEX "drugs_code_key" ON "drugs"("code");

-- CreateIndex
CREATE INDEX "drugs_dci_idx" ON "drugs"("dci");

-- CreateIndex
CREATE INDEX "drugs_category_idx" ON "drugs"("category");

-- CreateIndex
CREATE INDEX "drugs_isControlled_idx" ON "drugs"("isControlled");

-- CreateIndex
CREATE INDEX "drugs_isProgramDrug_idx" ON "drugs"("isProgramDrug");

-- CreateIndex
CREATE INDEX "drugs_isActive_idx" ON "drugs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "drug_substitutes_drugAId_drugBId_key" ON "drug_substitutes"("drugAId", "drugBId");

-- CreateIndex
CREATE INDEX "drug_interactions_drugAId_idx" ON "drug_interactions"("drugAId");

-- CreateIndex
CREATE INDEX "drug_interactions_drugBId_idx" ON "drug_interactions"("drugBId");

-- CreateIndex
CREATE UNIQUE INDEX "drug_interactions_drugAId_drugBId_key" ON "drug_interactions"("drugAId", "drugBId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "batches_drugId_idx" ON "batches"("drugId");

-- CreateIndex
CREATE INDEX "batches_expiryDate_idx" ON "batches"("expiryDate");

-- CreateIndex
CREATE INDEX "batches_isActive_idx" ON "batches"("isActive");

-- CreateIndex
CREATE INDEX "batches_isQuarantined_idx" ON "batches"("isQuarantined");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batchNumber_drugId_key" ON "batches"("batchNumber", "drugId");

-- CreateIndex
CREATE UNIQUE INDEX "storage_locations_code_key" ON "storage_locations"("code");

-- CreateIndex
CREATE INDEX "cold_chain_logs_batchId_idx" ON "cold_chain_logs"("batchId");

-- CreateIndex
CREATE INDEX "cold_chain_logs_recordedAt_idx" ON "cold_chain_logs"("recordedAt");

-- CreateIndex
CREATE INDEX "stock_movements_batchId_idx" ON "stock_movements"("batchId");

-- CreateIndex
CREATE INDEX "stock_movements_type_idx" ON "stock_movements"("type");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_createdById_idx" ON "stock_movements"("createdById");

-- CreateIndex
CREATE INDEX "stock_movements_dispensationLineId_idx" ON "stock_movements"("dispensationLineId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_hospitalNumber_key" ON "patients"("hospitalNumber");

-- CreateIndex
CREATE INDEX "patients_hospitalNumber_idx" ON "patients"("hospitalNumber");

-- CreateIndex
CREATE INDEX "patients_lastName_firstName_idx" ON "patients"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "patient_allergies_patientId_idx" ON "patient_allergies"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_prescriptionNumber_key" ON "prescriptions"("prescriptionNumber");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_idx" ON "prescriptions"("patientId");

-- CreateIndex
CREATE INDEX "prescriptions_status_idx" ON "prescriptions"("status");

-- CreateIndex
CREATE INDEX "prescriptions_visitDate_idx" ON "prescriptions"("visitDate");

-- CreateIndex
CREATE INDEX "prescriptions_prescribedById_idx" ON "prescriptions"("prescribedById");

-- CreateIndex
CREATE INDEX "prescription_lines_prescriptionId_idx" ON "prescription_lines"("prescriptionId");

-- CreateIndex
CREATE INDEX "prescription_lines_drugId_idx" ON "prescription_lines"("drugId");

-- CreateIndex
CREATE UNIQUE INDEX "dispensations_dispensationNumber_key" ON "dispensations"("dispensationNumber");

-- CreateIndex
CREATE INDEX "dispensations_patientId_idx" ON "dispensations"("patientId");

-- CreateIndex
CREATE INDEX "dispensations_dispensedAt_idx" ON "dispensations"("dispensedAt");

-- CreateIndex
CREATE INDEX "dispensations_prescriptionId_idx" ON "dispensations"("prescriptionId");

-- CreateIndex
CREATE INDEX "dispensation_lines_dispensationId_idx" ON "dispensation_lines"("dispensationId");

-- CreateIndex
CREATE INDEX "dispensation_lines_batchId_idx" ON "dispensation_lines"("batchId");

-- CreateIndex
CREATE INDEX "dispensation_lines_drugId_idx" ON "dispensation_lines"("drugId");

-- CreateIndex
CREATE INDEX "internal_usages_serviceId_idx" ON "internal_usages"("serviceId");

-- CreateIndex
CREATE INDEX "internal_usages_usedAt_idx" ON "internal_usages"("usedAt");

-- CreateIndex
CREATE INDEX "internal_usage_lines_internalUsageId_idx" ON "internal_usage_lines"("internalUsageId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_orders_transferNumber_key" ON "transfer_orders"("transferNumber");

-- CreateIndex
CREATE INDEX "transfer_orders_fromServiceId_idx" ON "transfer_orders"("fromServiceId");

-- CreateIndex
CREATE INDEX "transfer_orders_toServiceId_idx" ON "transfer_orders"("toServiceId");

-- CreateIndex
CREATE INDEX "transfer_orders_status_idx" ON "transfer_orders"("status");

-- CreateIndex
CREATE INDEX "transfer_order_lines_transferOrderId_idx" ON "transfer_order_lines"("transferOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "controlled_drug_entries_entryNumber_key" ON "controlled_drug_entries"("entryNumber");

-- CreateIndex
CREATE INDEX "controlled_drug_entries_drugId_idx" ON "controlled_drug_entries"("drugId");

-- CreateIndex
CREATE INDEX "controlled_drug_entries_entryDate_idx" ON "controlled_drug_entries"("entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_lines_purchaseOrderId_idx" ON "purchase_order_lines"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_lines_drugId_idx" ON "purchase_order_lines"("drugId");

-- CreateIndex
CREATE UNIQUE INDEX "physical_inventories_reference_key" ON "physical_inventories"("reference");

-- CreateIndex
CREATE INDEX "physical_inventories_isValidated_idx" ON "physical_inventories"("isValidated");

-- CreateIndex
CREATE INDEX "inventory_lines_inventoryId_idx" ON "inventory_lines"("inventoryId");

-- CreateIndex
CREATE INDEX "inventory_lines_batchId_idx" ON "inventory_lines"("batchId");

-- CreateIndex
CREATE INDEX "stock_alerts_drugId_idx" ON "stock_alerts"("drugId");

-- CreateIndex
CREATE INDEX "stock_alerts_type_status_idx" ON "stock_alerts"("type", "status");

-- CreateIndex
CREATE INDEX "stock_alerts_batchId_idx" ON "stock_alerts"("batchId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "hospital_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_substitutes" ADD CONSTRAINT "drug_substitutes_drugAId_fkey" FOREIGN KEY ("drugAId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_substitutes" ADD CONSTRAINT "drug_substitutes_drugBId_fkey" FOREIGN KEY ("drugBId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drugAId_fkey" FOREIGN KEY ("drugAId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drugBId_fkey" FOREIGN KEY ("drugBId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cold_chain_logs" ADD CONSTRAINT "cold_chain_logs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_dispensationLineId_fkey" FOREIGN KEY ("dispensationLineId") REFERENCES "dispensation_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "physical_inventories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_internalUsageId_fkey" FOREIGN KEY ("internalUsageId") REFERENCES "internal_usages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "transfer_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "insurances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescribedById_fkey" FOREIGN KEY ("prescribedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "hospital_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_lines" ADD CONSTRAINT "prescription_lines_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_lines" ADD CONSTRAINT "prescription_lines_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensation_lines" ADD CONSTRAINT "dispensation_lines_dispensationId_fkey" FOREIGN KEY ("dispensationId") REFERENCES "dispensations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensation_lines" ADD CONSTRAINT "dispensation_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensation_lines" ADD CONSTRAINT "dispensation_lines_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_usages" ADD CONSTRAINT "internal_usages_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "hospital_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_usages" ADD CONSTRAINT "internal_usages_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_usage_lines" ADD CONSTRAINT "internal_usage_lines_internalUsageId_fkey" FOREIGN KEY ("internalUsageId") REFERENCES "internal_usages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_usage_lines" ADD CONSTRAINT "internal_usage_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_usage_lines" ADD CONSTRAINT "internal_usage_lines_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_fromServiceId_fkey" FOREIGN KEY ("fromServiceId") REFERENCES "hospital_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_toServiceId_fkey" FOREIGN KEY ("toServiceId") REFERENCES "hospital_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_lines" ADD CONSTRAINT "transfer_order_lines_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "transfer_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_lines" ADD CONSTRAINT "transfer_order_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_lines" ADD CONSTRAINT "transfer_order_lines_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controlled_drug_entries" ADD CONSTRAINT "controlled_drug_entries_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controlled_drug_entries" ADD CONSTRAINT "controlled_drug_entries_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controlled_drug_entries" ADD CONSTRAINT "controlled_drug_entries_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_inventories" ADD CONSTRAINT "physical_inventories_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lines" ADD CONSTRAINT "inventory_lines_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "physical_inventories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lines" ADD CONSTRAINT "inventory_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lines" ADD CONSTRAINT "inventory_lines_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_acknowledgements" ADD CONSTRAINT "alert_acknowledgements_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "stock_alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_acknowledgements" ADD CONSTRAINT "alert_acknowledgements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
