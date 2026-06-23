import { prisma, pgPool } from "@/lib/prisma.js";
import {
  UserRole,
  DrugForm,
  DrugCategory,
  StorageCondition,
} from "../prisma/generated/prisma/client.js";
import * as argon2 from "argon2";

async function main() {
  console.log("🌱 Démarrage du seed...");

  // ─── 1. Hôpital service par défaut (Pharmacie centrale) ───────────────────
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

  // ─── 2. Utilisateur admin SUPERADMIN — argon2id ───────────────────────────
  const adminPassword = await argon2.hash("AdminPharma2026!", {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3, // 3 itérations
    parallelism: 4, // 4 threads parallèles
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

  // ─── 3. Médicaments de test (5 médicaments essentiels RDC) ────────────────
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

  // ─── 4. Configuration système ─────────────────────────────────────────────
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
      description: "Durée access token JWT (non utilisé en MVP - 24h fixe)",
    },
    {
      key: "session.refreshTokenTtlDays",
      value: "30",
      description: "Durée refresh token (non utilisé en MVP)",
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
