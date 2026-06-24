import { prisma, pgPool } from "@/lib/prisma.js";
import {
  UserRole,
  DrugForm,
  DrugCategory,
  StorageCondition,
  SupplierType,
  MovementType,
  Gender,
  AllergySeverity,
} from "../prisma/generated/prisma/client.js";
import * as argon2 from "argon2";

async function main() {
  console.log("🌱 Démarrage du seed...");

  // ─── 1. Hôpital service par défaut ─────────────────────────────────────────
  const pharmacyService = await prisma.hospitalService.upsert({
    where: { code: "PHARM" },
    update: {},
    create: {
      code: "PHARM",
      name: "Pharmacie Centrale",
      description: "Service principal de gestion des médicaments",
      floor: "Rez-de-chaussée",
      isActive: true,
    },
  });
  console.log(`✅ Service créé : ${pharmacyService.name}`);

  // ─── 2. Utilisateur admin SUPERADMIN ──────────────────────────────────────
  const adminPassword = await argon2.hash("AdminPharma2026!", {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    hashLength: 32,
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@pharmacie.cd" },
    update: {},
    create: {
      employeeId: "ADM-001",
      firstName: "Administrateur",
      lastName: "Système",
      email: "admin@pharmacie.cd",
      phone: "+243999999999",
      passwordHash: adminPassword,
      role: UserRole.SUPERADMIN,
      isActive: true,
      mustChangePassword: true,
      serviceId: pharmacyService.id,
      lastLoginAt: null,
      failedLoginCount: 0,
    },
  });
  console.log(
    `✅ Admin créé : ${admin.firstName} ${admin.lastName} (${admin.email})`
  );

  // ─── 3. Fournisseurs de test ──────────────────────────────────────────────
  const suppliers = [
    {
      code: "SUP-001",
      name: "PharmaRDC Distribution",
      type: SupplierType.WHOLESALER,
      contactPerson: "Jean Kabongo",
      phone: "+243811111111",
      email: "contact@pharmardc.cd",
      address: "Avenue des Poids Lourds, Kinshasa",
      city: "Kinshasa",
      country: "RDC",
      licenseNumber: "LIC-2024-001",
      paymentTermsDays: 30,
      currencyPreference: "USD",
      isActive: true,
    },
    {
      code: "SUP-002",
      name: "OMS RDC",
      type: SupplierType.NGO,
      contactPerson: "Dr Marie Dupont",
      phone: "+243822222222",
      email: "kinshasa@oms.cd",
      address: "Boulevard du 30 Juin",
      city: "Kinshasa",
      country: "RDC",
      isActive: true,
    },
  ];

  for (const supplierData of suppliers) {
    const supplier = await prisma.supplier.upsert({
      where: { code: supplierData.code },
      update: {},
      create: supplierData,
    });
    console.log(`✅ Fournisseur créé : ${supplier.name} (${supplier.code})`);
  }

  // ─── 4. Emplacements de stockage ──────────────────────────────────────────
  const locations = [
    { code: "GEN-A1", name: "Général Allée A Étagère 1", zone: "GENERAL" },
    { code: "GEN-A2", name: "Général Allée A Étagère 2", zone: "GENERAL" },
    { code: "FRIG-01", name: "Réfrigérateur Principal", zone: "REFRIGERE" },
    { code: "STUP-01", name: "Armoire Stupéfiants", zone: "STUPEFIANT" },
    { code: "QUAR-01", name: "Zone Quarantaine", zone: "QUARANTAINE" },
  ];

  for (const locData of locations) {
    const location = await prisma.storageLocation.upsert({
      where: { code: locData.code },
      update: {},
      create: { ...locData, isActive: true },
    });
    console.log(`✅ Emplacement créé : ${location.name} (${location.code})`);
  }

  // ─── 5. Médicaments de test ─────────────────────────────────────────────
  const drugs = [
    {
      code: "PARA-500",
      name: "Paracétamol",
      genericName: "Paracétamol",
      dci: "PARACETAMOL",
      form: DrugForm.TABLET,
      category: DrugCategory.ANALGESIC,
      dosage: "500mg",
      concentration: null,
      unitOfDispense: "comprimé",
      packSize: 10,
      packUnit: "boîte",
      isEssential: true,
      isControlled: false,
      isProgramDrug: false,
      storageConditions: [StorageCondition.ROOM_TEMP],
      requiresColdChain: false,
      unitPriceCDF: 2500.0,
      unitPriceUSD: 0.9,
      minStockLevel: 100,
      criticalStockLevel: 50,
      reorderPoint: 200,
      reorderQuantity: 500,
      isActive: true,
      notes: "Antalgique et antipyrétique de première intention",
    },
    {
      code: "AMOX-500",
      name: "Amoxicilline",
      genericName: "Amoxicilline",
      dci: "AMOXICILLIN",
      form: DrugForm.CAPSULE,
      category: DrugCategory.ANTIBIOTIC,
      dosage: "500mg",
      concentration: null,
      unitOfDispense: "gélule",
      packSize: 12,
      packUnit: "boîte",
      isEssential: true,
      isControlled: false,
      isProgramDrug: false,
      storageConditions: [
        StorageCondition.ROOM_TEMP,
        StorageCondition.PROTECT_HUMIDITY,
      ],
      requiresColdChain: false,
      unitPriceCDF: 3500.0,
      unitPriceUSD: 1.25,
      minStockLevel: 80,
      criticalStockLevel: 40,
      reorderPoint: 150,
      reorderQuantity: 400,
      isActive: true,
      notes: "Antibiotique bêta-lactamine large spectre",
    },
    {
      code: "ART-LUM",
      name: "Coartem",
      genericName: "Artéméther/Luméfantrine",
      dci: "ARTEMETHER_LUMEFANTRINE",
      form: DrugForm.TABLET,
      category: DrugCategory.ANTIMALARIAL,
      dosage: "20mg/120mg",
      concentration: null,
      unitOfDispense: "comprimé",
      packSize: 24,
      packUnit: "boîte",
      isEssential: true,
      isControlled: false,
      isProgramDrug: true,
      programName: "PNLP",
      storageConditions: [
        StorageCondition.ROOM_TEMP,
        StorageCondition.PROTECT_LIGHT,
      ],
      requiresColdChain: false,
      unitPriceCDF: 5000.0,
      unitPriceUSD: 1.8,
      minStockLevel: 200,
      criticalStockLevel: 100,
      reorderPoint: 500,
      reorderQuantity: 1000,
      isActive: true,
      notes:
        "ACT de première ligne - Programme National de Lutte contre le Paludisme",
    },
    {
      code: "INSU-NPH",
      name: "Insuline NPH",
      genericName: "Insuline isophane (NPH)",
      dci: "INSULIN_ISOPHANE",
      form: DrugForm.INJECTABLE_SC,
      category: DrugCategory.ANTIDIABETIC,
      dosage: "100 UI/ml",
      concentration: "100 UI/ml",
      unitOfDispense: "flacon",
      packSize: 1,
      packUnit: "flacon",
      isEssential: true,
      isControlled: false,
      isProgramDrug: false,
      storageConditions: [StorageCondition.REFRIGERATED],
      requiresColdChain: true,
      minTemp: 2.0,
      maxTemp: 8.0,
      unitPriceCDF: 15000.0,
      unitPriceUSD: 5.4,
      minStockLevel: 20,
      criticalStockLevel: 10,
      reorderPoint: 50,
      reorderQuantity: 100,
      isActive: true,
      notes: "Chaîne du froid obligatoire - ne jamais congeler",
    },
    {
      code: "MORP-10",
      name: "Morphine",
      genericName: "Morphine sulfate",
      dci: "MORPHINE",
      form: DrugForm.INJECTABLE_IV,
      category: DrugCategory.ANALGESIC,
      dosage: "10mg/ml",
      concentration: "10mg/ml",
      unitOfDispense: "ampoule",
      packSize: 10,
      packUnit: "boîte",
      isEssential: true,
      isControlled: true,
      controlledSchedule: "I",
      isProgramDrug: false,
      storageConditions: [
        StorageCondition.CONTROLLED_SUBSTANCE,
        StorageCondition.ROOM_TEMP,
      ],
      requiresColdChain: false,
      unitPriceCDF: 25000.0,
      unitPriceUSD: 9.0,
      minStockLevel: 10,
      criticalStockLevel: 5,
      reorderPoint: 30,
      reorderQuantity: 50,
      isActive: true,
      notes: "Stupéfiant tableau I - armoire sécurisée, double signature",
    },
  ];

  for (const drugData of drugs) {
    const drug = await prisma.drug.upsert({
      where: { code: drugData.code },
      update: {},
      create: drugData,
    });
    console.log(`✅ Médicament créé : ${drug.name} (${drug.code})`);
  }

  // ─── 6. Lots de test ──────────────────────────────────────────────────────
  const paraDrug = await prisma.drug.findUnique({
    where: { code: "PARA-500" },
  });
  const amoxDrug = await prisma.drug.findUnique({
    where: { code: "AMOX-500" },
  });
  const artDrug = await prisma.drug.findUnique({ where: { code: "ART-LUM" } });
  const insuDrug = await prisma.drug.findUnique({
    where: { code: "INSU-NPH" },
  });
  const morpDrug = await prisma.drug.findUnique({ where: { code: "MORP-10" } });
  const supplier1 = await prisma.supplier.findUnique({
    where: { code: "SUP-001" },
  });
  const genLocation = await prisma.storageLocation.findUnique({
    where: { code: "GEN-A1" },
  });
  const frigLocation = await prisma.storageLocation.findUnique({
    where: { code: "FRIG-01" },
  });
  const stupLocation = await prisma.storageLocation.findUnique({
    where: { code: "STUP-01" },
  });

  if (paraDrug && supplier1 && genLocation) {
    const batch = await prisma.batch.upsert({
      where: {
        batchNumber_drugId: {
          batchNumber: "LOT-PARA-001",
          drugId: paraDrug.id,
        },
      },
      update: {},
      create: {
        batchNumber: "LOT-PARA-001",
        drugId: paraDrug.id,
        supplierId: supplier1.id,
        initialQuantity: 500,
        currentQuantity: 500,
        expiryDate: new Date("2027-06-01"),
        purchasePriceCDF: 2000.0,
        purchasePriceUSD: 0.7,
        locationId: genLocation.id,
        coldChainVerified: true,
        isActive: true,
      },
    });
    console.log(`✅ Lot créé : ${batch.batchNumber} (${paraDrug.name})`);

    await prisma.stockMovement.create({
      data: {
        batchId: batch.id,
        type: MovementType.RECEPTION,
        quantity: 500,
        quantityBefore: 0,
        quantityAfter: 500,
        createdById: admin.id,
        reason: "Réception initiale seed",
      },
    });
  }

  if (amoxDrug && supplier1 && genLocation) {
    const batch = await prisma.batch.upsert({
      where: {
        batchNumber_drugId: {
          batchNumber: "LOT-AMOX-001",
          drugId: amoxDrug.id,
        },
      },
      update: {},
      create: {
        batchNumber: "LOT-AMOX-001",
        drugId: amoxDrug.id,
        supplierId: supplier1.id,
        initialQuantity: 400,
        currentQuantity: 400,
        expiryDate: new Date("2026-12-15"),
        purchasePriceCDF: 2800.0,
        purchasePriceUSD: 1.0,
        locationId: genLocation.id,
        coldChainVerified: true,
        isActive: true,
      },
    });
    console.log(`✅ Lot créé : ${batch.batchNumber} (${amoxDrug.name})`);

    await prisma.stockMovement.create({
      data: {
        batchId: batch.id,
        type: MovementType.RECEPTION,
        quantity: 400,
        quantityBefore: 0,
        quantityAfter: 400,
        createdById: admin.id,
        reason: "Réception initiale seed",
      },
    });
  }

  if (artDrug && supplier1 && genLocation) {
    const batch = await prisma.batch.upsert({
      where: {
        batchNumber_drugId: { batchNumber: "LOT-ART-001", drugId: artDrug.id },
      },
      update: {},
      create: {
        batchNumber: "LOT-ART-001",
        drugId: artDrug.id,
        supplierId: supplier1.id,
        initialQuantity: 1000,
        currentQuantity: 1000,
        expiryDate: new Date("2027-03-20"),
        purchasePriceCDF: 4000.0,
        purchasePriceUSD: 1.45,
        locationId: genLocation.id,
        coldChainVerified: true,
        isActive: true,
      },
    });
    console.log(`✅ Lot créé : ${batch.batchNumber} (${artDrug.name})`);

    await prisma.stockMovement.create({
      data: {
        batchId: batch.id,
        type: MovementType.RECEPTION,
        quantity: 1000,
        quantityBefore: 0,
        quantityAfter: 1000,
        createdById: admin.id,
        reason: "Réception initiale seed",
      },
    });
  }

  if (insuDrug && frigLocation) {
    const batch = await prisma.batch.upsert({
      where: {
        batchNumber_drugId: {
          batchNumber: "LOT-INSU-001",
          drugId: insuDrug.id,
        },
      },
      update: {},
      create: {
        batchNumber: "LOT-INSU-001",
        drugId: insuDrug.id,
        supplierId: supplier1?.id,
        initialQuantity: 100,
        currentQuantity: 100,
        expiryDate: new Date("2026-09-10"),
        purchasePriceCDF: 12000.0,
        purchasePriceUSD: 4.3,
        locationId: frigLocation.id,
        coldChainVerified: true,
        isActive: true,
      },
    });
    console.log(`✅ Lot créé : ${batch.batchNumber} (${insuDrug.name})`);

    await prisma.stockMovement.create({
      data: {
        batchId: batch.id,
        type: MovementType.RECEPTION,
        quantity: 100,
        quantityBefore: 0,
        quantityAfter: 100,
        createdById: admin.id,
        reason: "Réception initiale seed",
      },
    });
  }

  if (morpDrug && stupLocation) {
    const batch = await prisma.batch.upsert({
      where: {
        batchNumber_drugId: {
          batchNumber: "LOT-MORP-001",
          drugId: morpDrug.id,
        },
      },
      update: {},
      create: {
        batchNumber: "LOT-MORP-001",
        drugId: morpDrug.id,
        supplierId: supplier1?.id,
        initialQuantity: 50,
        currentQuantity: 50,
        expiryDate: new Date("2027-01-30"),
        purchasePriceCDF: 20000.0,
        purchasePriceUSD: 7.2,
        locationId: stupLocation.id,
        coldChainVerified: true,
        isActive: true,
      },
    });
    console.log(`✅ Lot créé : ${batch.batchNumber} (${morpDrug.name})`);

    await prisma.stockMovement.create({
      data: {
        batchId: batch.id,
        type: MovementType.RECEPTION,
        quantity: 50,
        quantityBefore: 0,
        quantityAfter: 50,
        createdById: admin.id,
        reason: "Réception initiale seed",
      },
    });
  }

  // ─── 7. Configuration système ───────────────────────────────────────────────
  const configs = [
    {
      key: "hospital.name",
      value: "Hôpital Général de Référence",
      description: "Nom affiché sur les reçus et rapports",
    },
    {
      key: "hospital.province",
      value: "Kinshasa",
      description: "Province de l'établissement",
    },
    {
      key: "currency.primary",
      value: "CDF",
      description: "Devise principale d'affichage",
    },
    {
      key: "currency.secondary",
      value: "USD",
      description: "Devise secondaire",
    },
    {
      key: "alert.expiryWarningDays",
      value: "90",
      description: "Jours avant péremption pour alerte EXPIRY_SOON",
    },
    {
      key: "alert.criticalExpiryDays",
      value: "30",
      description: "Seuil critique péremption",
    },
    {
      key: "alert.lowStockEnabled",
      value: "true",
      description: "Activer les alertes stock bas",
    },
    {
      key: "session.accessTokenTtlMin",
      value: "15",
      description: "Durée access token JWT",
    },
    {
      key: "session.refreshTokenTtlDays",
      value: "30",
      description: "Durée refresh token",
    },
    {
      key: "prescription.validityDays",
      value: "3",
      description: "Validité ordonnance non servie (jours)",
    },
    {
      key: "dispensation.allowWithoutRx",
      value: "false",
      description: "Autoriser dispensation sans ordonnance",
    },
    {
      key: "controlled.requireDualSign",
      value: "true",
      description: "Double signature stupéfiants",
    },
    {
      key: "controlled.schedulesDualSign",
      value: "I,II",
      description: "Tableaux concernés",
    },
    {
      key: "coldChain.alertTempMax",
      value: "8",
      description: "Température max chaîne du froid (°C)",
    },
    {
      key: "coldChain.alertTempMin",
      value: "2",
      description: "Température min chaîne du froid (°C)",
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: {
        key: config.key,
        value: config.value,
        description: config.description,
      },
    });
  }
  console.log(`✅ ${configs.length} configurations système créées`);

  // ─── 8. Patients de test ──────────────────────────────────────────────────
  const patients = [
    {
      hospitalNumber: "PAT-001",
      firstName: "Jean",
      lastName: "Mukendi",
      dateOfBirth: new Date("1985-03-15"),
      gender: Gender.MALE,
      nationalId: "85-03-15-001",
      phone: "+243811111111",
      address: "Avenue Kasa-Vubu, Quartier Matonge",
      commune: "Kalamu",
      territoire: "Lukunga",
      province: "Kinshasa",
      isHivPatient: false,
      isTbPatient: false,
      chronicConditions: ["Hypertension artérielle"],
      isActive: true,
      notes: "Patient régulier - suivi HTA",
    },
    {
      hospitalNumber: "PAT-002",
      firstName: "Marie",
      lastName: "Tshibola",
      dateOfBirth: new Date("1992-07-22"),
      gender: Gender.FEMALE,
      nationalId: "92-07-22-002",
      phone: "+243822222222",
      address: "Boulevard Lumumba, Ngaba",
      commune: "Ngaba",
      territoire: "Mont-Amba",
      province: "Kinshasa",
      isHivPatient: true,
      arvCode: "PNAME-2024-001",
      isTbPatient: false,
      chronicConditions: [],
      isActive: true,
      notes: "Patient VIH - programme ARV",
    },
    {
      hospitalNumber: "PAT-003",
      firstName: "Pierre",
      lastName: "Kasongo",
      dateOfBirth: new Date("1978-11-30"),
      gender: Gender.MALE,
      nationalId: "78-11-30-003",
      phone: "+243833333333",
      address: "Avenue de l'Université, Lemba",
      commune: "Lemba",
      territoire: "Mont-Amba",
      province: "Kinshasa",
      isHivPatient: false,
      isTbPatient: true,
      tbCode: "TB-2024-045",
      chronicConditions: ["Diabète type 2"],
      isActive: true,
      notes: "Patient TB + Diabète - suivi PNT",
    },
  ];

  for (const patientData of patients) {
    const patient = await prisma.patient.upsert({
      where: { hospitalNumber: patientData.hospitalNumber },
      update: {},
      create: patientData,
    });
    console.log(
      `✅ Patient créé : ${patient.firstName} ${patient.lastName} (${patient.hospitalNumber})`
    );
  }

  // Allergies de test
  const jeanPatient = await prisma.patient.findUnique({
    where: { hospitalNumber: "PAT-001" },
  });
  if (jeanPatient) {
    await prisma.patientAllergy.upsert({
      where: { id: "allergy-test-001" },
      update: {},
      create: {
        id: "allergy-test-001",
        patientId: jeanPatient.id,
        substance: "Pénicilline",
        reaction: "Urticaire généralisée, œdème des paupières",
        severity: AllergySeverity.SEVERE,
        confirmedAt: new Date("2024-01-15"),
        confirmedBy: "Dr Kabongo",
        notes: "Allergie confirmée - éviter tous les bêta-lactamines",
      },
    });
    console.log(
      `✅ Allergie créée pour ${jeanPatient.firstName} ${jeanPatient.lastName}`
    );
  }

  // ─── 9. Ordonnance de test ────────────────────────────────────────────────
  const jeanPatientForRx = await prisma.patient.findUnique({
    where: { hospitalNumber: "PAT-001" },
  });
  const paraDrugForRx = await prisma.drug.findUnique({
    where: { code: "PARA-500" },
  });
  const adminForRx = await prisma.user.findUnique({
    where: { email: "admin@pharmacie.cd" },
  });

  if (jeanPatientForRx && paraDrugForRx && adminForRx) {
    const prescription = await prisma.prescription.create({
      data: {
        prescriptionNumber: "ORD-2026-000001",
        patientId: jeanPatientForRx.id,
        prescribedById: adminForRx.id,
        isInpatient: false,
        visitDate: new Date(),
        validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        diagnosisCode: "R50.9",
        diagnosisLabel: "Fièvre, non spécifiée",
      },
    });

    await prisma.prescriptionLine.create({
      data: {
        prescriptionId: prescription.id,
        drugId: paraDrugForRx.id,
        lineNumber: 1,
        quantityPrescribed: 20,
        dosage: "1 comprimé matin et soir pendant 10 jours",
        frequency: "2 fois par jour",
        durationDays: 10,
        route: "orale",
      },
    });

    console.log(
      `✅ Ordonnance de test créée : ${prescription.prescriptionNumber}`
    );
  }

  console.log("\n🎉 Seed terminé avec succès !");
  console.log("\n📋 Identifiants de connexion :");
  console.log("   Email    : admin@pharmacie.cd");
  console.log("   Mot de passe : AdminPharma2026!");
  console.log(
    "   ⚠️  Le mot de passe doit être changé à la première connexion."
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pgPool.end();
  })
  .catch(async (e) => {
    console.error("❌ Erreur lors du seed :", e);
    await prisma.$disconnect();
    await pgPool.end();
    process.exit(1);
  });
