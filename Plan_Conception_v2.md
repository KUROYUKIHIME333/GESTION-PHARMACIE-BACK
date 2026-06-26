# Plan de Conception — Logiciel de Gestion de Pharmacie Hospitalière

**Version :** 2.0
**Date :** 21 juin 2026
**Statut :** Document de conception (Design Document)
**Auteur :** RAMAZANI SUMAILI Daniel Herman
**Localisation :** Kinshasa, République Démocratique du Congo (RDC)

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Philosophie du projet](#2-philosophie-du-projet)
3. [Stack technique](#3-stack-technique)
4. [Architecture logicielle](#4-architecture-logicielle)
5. [Modèle de données](#5-modèle-de-données)
6. [Modules fonctionnels](#6-modules-fonctionnels)
7. [Sécurité](#7-sécurité)
8. [Structure du projet](#8-structure-du-projet)
9. [CI/CD et qualité](#9-cicd-et-qualité)
10. [Observabilité](#10-observabilité)
11. [Plan de lancement](#11-plan-de-lancement)
12. [Points critiques](#12-points-critiques)
13. [Annexes](#13-annexes)

---

## 1. Introduction

### 1.1 Objectif

Conception technique et fonctionnelle d'un logiciel de gestion de pharmacie hospitalière destiné à un établissement de santé en République Démocratique du Congo.
Ce document sert de référence unique pour les parties prenantes (développeurs, pharmaciens, administrateurs système).

### 1.2 Portée

| Phase | Périmètre |
|-------|-----------|
| **MVP (v1.0)** | Auth, référentiel médicaments, gestion des lots, mouvements de stock, patients, ordonnances, dispensation, alertes stock/péremption, rapports basiques |
| **V2** | Commandes fournisseurs, inventaire physique, usage interne, transferts inter-services, chaîne du froid, registre stupéfiants UI, assurances |
| **V3+** | Multi-sites, analytics avancés, application mobile, intégration SIH/FHIR |

> **Principe de périmètre** : le schéma de base de données complet est déployé dès le MVP. Les tables V2/V3 existent en base mais leurs routes API et leurs écrans UI sont absents jusqu'à la phase correspondante. Cela évite toute migration destructive ultérieure.

### 1.3 Références

- Schéma Prisma v2.0 — `schema.prisma` (source de vérité, versionné dans le repo)
- Réglementation DPLM (Direction de la Pharmacie et du Médicament, RDC) — à valider avec un pharmacien agréé
- Liste des médicaments essentiels OMS — à confronter avec la liste nationale
- Normes de conservation des stupéfiants et psychotropes — à valider selon les textes légaux en vigueur

---

## 2. Philosophie du projet

### 2.1 Principe directeur

> **Ship fast, break simple.**

Pas de sur-ingénierie. Des *seams* (coutures) bien placées pour que chaque partie soit remplaçable sans tout refaire. On vise un système qui tourne en production dans un hôpital en 8 semaines, pas un chef-d'œuvre d'architecture.

### 2.2 Principes de conception

| Principe | Application concrète |
|----------|----------------------|
| **Traçabilité totale** | Toute variation de stock passe par un `StockMovement` — `Batch.currentQuantity` n'est jamais modifié directement |
| **Audit immuable** | `AuditLog` et `StockMovement` : pas de `UPDATE` ni de `DELETE` en production, enforced par trigger PostgreSQL |
| **Offline-first** | PWA avec Service Worker + IndexedDB pour fonctionner pendant les coupures électriques/réseau (fréquentes en contexte local) |
| **Sécurité par défaut** | RBAC sur chaque route dès le départ ; chiffrement des champs ultra-sensibles (VIH, TB) dès le MVP |
| **Schéma complet dès le départ** | Toutes les tables déployées en migration initiale ; les fonctionnalités V2 sont des routes et des écrans à ajouter, pas des migrations à risque |
| **Pas de dépendance externe inutile** | Pas de Redis en MVP. PostgreSQL fait tout : sessions, rate limiting via table, jobs via `pg_cron`. Moins de services = moins de pannes à gérer |

---

## 3. Stack technique

### 3.1 Backend

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Runtime | **Node.js 20 LTS + TypeScript** | Écosystème mature, typage fort, une seule langue front/back |
| Framework | **Fastify 4+** | Perf supérieure à Express, typage natif des routes, plugin system solide |
| ORM | **Prisma** | Migrations versionnées, schéma comme source de vérité, client typé généré automatiquement |
| Base de données | **PostgreSQL 15+** | ACID, `pgcrypto` (chiffrement colonnes), `pg_cron` (jobs planifiés), `pg_stat_statements` (perf) |
| Auth | **JWT maison** (access token 15min, refresh token 30j) | Contrôle total, pas de dépendance externe ; sessions stockées en base (`Session` table) |
| Rate limiting | **Table PostgreSQL** `rate_limit_buckets` (token bucket simple) | ✅ Remplace Redis en MVP. Une table avec index sur `(ip, window)` + `pg_cron` pour purge toutes les heures. Largement suffisant en MVP |
| Jobs planifiés | **`pg_cron`** (extension PostgreSQL) | ✅ Remplace node-cron et BullMQ en MVP. Les alertes péremption et stock bas sont des requêtes SQL simples planifiables directement. Pas de processus Node.js supplémentaire à maintenir |
| Validation | **Zod** | Schémas partagés entre frontend et backend via le package `shared/` du monorepo |
| Logs | **Pino** (natif Fastify) | Logs JSON structurés, zéro configuration, performant |

> **Note sur Redis** : Redis est écarté du MVP. Les deux usages prévus (sessions et rate limiting) sont couverts par PostgreSQL sans complexité opérationnelle supplémentaire. Redis pourra être ajouté en V2 si un besoin de cache chaud se manifeste (rapports lourds, WebSockets temps réel).

### 3.2 Frontend

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Framework | **Next.js 14+ (App Router)** | SSR pour les rapports imprimables, routing simple, PWA native via `next-pwa` |
| UI | **Tailwind CSS + shadcn/ui** | Composants sans lock-in, code propriétaire, rapide à assembler |
| State serveur | **TanStack Query (React Query)** | Cache intelligent, revalidation automatique, offline support natif |
| State global local | **Zustand** | Léger, simple, suffisant pour l'auth et les préférences utilisateur |
| Formulaires | **React Hook Form + Zod** | Validation isomorphe avec le backend (mêmes schémas Zod partagés) |
| PWA | **Service Workers + IndexedDB** | Fonctionnement offline pour le référentiel médicaments et la consultation stock |

### 3.3 Infrastructure

| Environnement | Solution | Justification |
|---------------|----------|---------------|
| Développement | **Docker Compose** | PostgreSQL uniquement — reproductible, onboarding rapide |
| Production MVP | **VPS Hetzner CX21** (2 vCPU, 4 Go RAM, 40 Go SSD) ou **Railway** | Coût maîtrisé (~5–15 €/mois), suffisant pour un hôpital |
| SSL | **Caddy** (reverse proxy avec Let's Encrypt automatique) | Plus simple que nginx + certbot, HTTPS en une ligne de config |
| Secrets | Variables d'environnement via fichier `.env` chiffré ou **Doppler** | Jamais de secrets dans le code |
| Backups | `pg_dump` quotidien via `pg_cron` → copie sur stockage distant (S3 ou Backblaze B2) | Automatisé, testable, peu coûteux |

> **Choix délibéré** : pas de Kubernetes avant d'avoir un problème de scale réel. Kubernetes avant V3 serait de la sur-ingénierie pure.

---

## 4. Architecture logicielle

### 4.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (Next.js 14 + PWA)                  │
│   Service Worker → IndexedDB (drugs, stock — offline)        │
│   /dashboard  /stock  /dispensation  /patients  /rapports    │
└──────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / REST JSON
┌──────────────────────────▼──────────────────────────────────┐
│               API (Fastify 4 + TypeScript)                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Plugins transverses                                   │  │
│  │  prisma.ts │ auth.ts (JWT) │ rbac.ts │ audit.ts        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Modules métier (monolithique modulaire)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │   auth   │ │   drug   │ │  stock   │ │  dispensation │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ patient  │ │prescrip. │ │  alert   │ │   report     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │     PostgreSQL 15+         │
              │  - Données applicatives    │
              │  - Sessions (table)        │
              │  - Rate limiting (table)   │
              │  - Jobs planifiés (pg_cron)│
              └───────────────────────────┘
```

### 4.2 Monorepo

```
pharmacie-hospitaliere/
├── apps/
│   ├── api/                      ← Fastify backend
│   │   ├── src/
│   │   │   ├── modules/          ← modules métier
│   │   │   ├── plugins/          ← extensions Fastify transverses
│   │   │   ├── lib/              ← utilitaires, erreurs, constantes
│   │   │   └── app.ts            ← point d'entrée
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── web/                      ← Next.js frontend
│       ├── src/
│       │   ├── app/              ← App Router (pages)
│       │   ├── components/       ← composants UI
│       │   ├── hooks/            ← hooks React
│       │   └── lib/              ← client API, queryClient, utils
│       └── package.json
│
├── packages/
│   ├── shared/                   ← schémas Zod + types TypeScript partagés
│   │   ├── src/
│   │   │   ├── schemas/          ← Zod schemas (validation API + formulaires)
│   │   │   └── types/            ← types TypeScript dérivés des schémas
│   │   └── package.json
│   │
│   └── database/                 ← Prisma schema + migrations
│       ├── prisma/
│       │   ├── schema.prisma     ← source de vérité unique
│       │   ├── migrations/       ← migrations versionnées
│       │   └── seed.ts           ← données initiales (SystemConfig, admin)
│       └── package.json
│
├── docker-compose.yml            ← PostgreSQL uniquement (pas de Redis)
├── Caddyfile                     ← reverse proxy + SSL automatique
├── turbo.json
└── pnpm-workspace.yaml
```

### 4.3 Patterns architecturaux

| Pattern | Application | Pourquoi ici |
|---------|-------------|--------------|
| **Event Sourcing (light)** | `StockMovement` comme source de vérité du stock | Toute l'histoire du stock est reconstructible ; audit natif |
| **Repository Pattern** | Service métier → Prisma Client (jamais de Prisma dans les routes) | Testabilité : on peut mocker le repository dans les tests |
| **Plugin Fastify** | Auth, RBAC, audit injectés comme décorateurs | Séparation claire entre transport et logique métier |
| **Schéma partagé Zod** | Un schéma Zod = validation backend + type frontend + inférence TypeScript | Single source of truth pour les contrats d'API |

> **Ce qu'on ne fait pas en MVP** : CQRS, vues matérialisées, event bus, microservices. PostgreSQL supporte très bien les requêtes analytiques pour les rapports MVP sans infrastructure supplémentaire.

---

## 5. Modèle de données

### 5.1 Principe fondamental

> **Toute variation de stock passe par un `StockMovement`.**
> `Batch.currentQuantity` est une dénormalisation de confort, maintenue synchrone avec la somme de ses mouvements via la logique applicative **et** un trigger PostgreSQL de vérification.
> Ne jamais modifier `currentQuantity` directement en SQL ou via Prisma hors du service `StockService`.

### 5.2 Stratégie MVP vs V2

Le schéma Prisma complet est déployé dès le départ. Seules les routes API et les écrans UI sont ajoutés progressivement.

| Domaine | Actif en MVP | Masqué en UI (V2) |
|---------|--------------|-------------------|
| Identité | `User`, `Session`, `HospitalService` | — |
| Référentiel | `Drug`, `DrugSubstitute`, `DrugInteraction`, `StorageLocation` | UI substituts et interactions |
| Stock | `Batch`, `StockMovement`, `StockAlert`, `AlertAcknowledgement` | `ColdChainLog` |
| Patients | `Patient`, `PatientAllergy` | `Insurance`, champs VIH/TB (UI restreinte) |
| Dispensation | `Prescription`, `PrescriptionLine`, `Dispensation`, `DispensationLine` | — |
| Approvisionnement | `Supplier` (fiche seule, pas de commande) | `PurchaseOrder`, `PurchaseOrderLine` |
| Usage interne | — | `InternalUsage`, `InternalUsageLine` |
| Transferts | — | `TransferOrder`, `TransferOrderLine` |
| Réglementaire | — | `ControlledDrugEntry` (UI registre stupéfiants) |
| Inventaire | — | `PhysicalInventory`, `InventoryLine` |
| Transverse | `AuditLog`, `SystemConfig` | — |

### 5.3 Entités clés et leurs règles métier

#### Drug — Référentiel médicament

Représente la fiche produit, indépendante des lots physiques. Un Drug sans Batch actif = rupture de stock.

| Champ | Type | Description |
|-------|------|-------------|
| `code` | String @unique | Code interne pharmacie — affiché sur les étiquettes |
| `dci` | String | DCI OMS — obligatoire, sert à la recherche générique |
| `form` | DrugForm | Galénique (enum typé) |
| `category` | DrugCategory | Classification thérapeutique (enum typé) |
| `isControlled` | Boolean | Stupéfiant/psychotrope — déclenche les règles registre |
| `isEssential` | Boolean | Liste médicaments essentiels — priorité réapprovisionnement |
| `minStockLevel` | Int | Seuil alerte LOW_STOCK |
| `criticalStockLevel` | Int | Seuil alerte CRITICAL_STOCK (commande urgente) |
| `requiresColdChain` | Boolean | Chaîne du froid — lot rejeté si `coldChainVerified = false` |
| `unitPriceCDF` / `unitPriceUSD` | Decimal | Prix de vente — snapshot copié sur `DispensationLine` |

**Contraintes PostgreSQL à créer :**
```sql
-- Seuils cohérents
ALTER TABLE drugs ADD CONSTRAINT chk_stock_levels
  CHECK (critical_stock_level <= min_stock_level AND min_stock_level <= reorder_point);

-- Prix positifs
ALTER TABLE drugs ADD CONSTRAINT chk_prices_positive
  CHECK (unit_price_cdf IS NULL OR unit_price_cdf >= 0)
  CHECK (unit_price_usd IS NULL OR unit_price_usd >= 0);
```

#### Batch — Lot physique

Unité de traçabilité principale. Chaque réception crée un Batch distinct.

| Champ | Type | Description |
|-------|------|-------------|
| `batchNumber` | String | Numéro de lot fabricant |
| `currentQuantity` | Int | Stock actuel — maintenu par `StockService`, protégé par trigger |
| `expiryDate` | DateTime | Date péremption — obligatoire, jamais nulle |
| `isQuarantined` | Boolean | Lot bloqué — dispensation rejetée si `true` |
| `isActive` | Boolean | `false` = lot épuisé ou retiré définitivement |

**Contraintes PostgreSQL :**
```sql
-- Quantités cohérentes
ALTER TABLE batches ADD CONSTRAINT chk_quantities
  CHECK (current_quantity >= 0 AND initial_quantity > 0 AND current_quantity <= initial_quantity);

-- Péremption dans le futur à la réception (warning uniquement — un lot peut arriver proche péremption)
-- À gérer côté applicatif, pas en contrainte DB (cas des dons d'urgence)
```

**Trigger d'immuabilité de `currentQuantity` :**
```sql
-- Empêche la modification directe de current_quantity hors contexte de StockMovement
-- Le trigger vérifie que la mise à jour vient bien d'une transaction qui crée simultanément un StockMovement
CREATE OR REPLACE FUNCTION check_batch_quantity_update()
RETURNS TRIGGER AS $$
BEGIN
  -- En MVP : log uniquement + raise si pas de StockMovement en cours dans la transaction
  -- Implémentation complète à affiner avec un app_context PostgreSQL
  IF NEW.current_quantity <> OLD.current_quantity THEN
    IF current_setting('app.stock_movement_in_progress', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'current_quantity ne peut être modifié que via StockMovement';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_batch_quantity_guard
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION check_batch_quantity_update();
```

#### StockMovement — Journal immuable

Enregistrement de toute variation de stock. Ne jamais permettre UPDATE ou DELETE sur cette table.

| Champ | Type | Description |
|-------|------|-------------|
| `type` | MovementType | Type de mouvement (enum) |
| `quantity` | Int | Positif = entrée, négatif = sortie |
| `quantityBefore` | Int | Snapshot avant — audit sans recalcul |
| `quantityAfter` | Int | Snapshot après = `quantityBefore + quantity` |

**Contraintes PostgreSQL :**
```sql
-- Cohérence des snapshots
ALTER TABLE stock_movements ADD CONSTRAINT chk_movement_coherence
  CHECK (quantity_after = quantity_before + quantity);

-- Stock jamais négatif après mouvement
ALTER TABLE stock_movements ADD CONSTRAINT chk_no_negative_stock
  CHECK (quantity_after >= 0);

-- Trigger immuabilité
CREATE OR REPLACE FUNCTION prevent_movement_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Les mouvements de stock sont immuables — pas de modification ni suppression';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_movement_immutable
  BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_movement_modification();
```

#### Prescription & Dispensation

**Règles métier critiques à la dispensation :**

1. Le lot sélectionné ne doit pas être périmé (`expiryDate > now()`)
2. Le lot ne doit pas être en quarantaine (`isQuarantined = false`)
3. Le lot doit avoir assez de stock (`currentQuantity >= quantityDemandée`)
4. Les allergies du patient doivent être vérifiées (`allergyCheckDone = true` obligatoire)
5. Si le Drug est contrôlé (`isControlled = true`), une entrée `ControlledDrugEntry` est créée automatiquement
6. La sélection du lot suit FEFO (First Expired, First Out ou « premier expiré, premier sorti ») : lot avec `expiryDate` la plus proche en premier. C'est une stratégie de gestion des stocks qui priorise la dispensation des produits périssables (médicaments, aliments) ayant la date de péremption la plus proche, indépendamment de leur date d'arrivée

**Flux de statut Prescription :**
```
DRAFT → PENDING → PARTIALLY_DISPENSED → DISPENSED
                ↘ CANCELLED
                ↘ EXPIRED (job pg_cron quotidien)
```

#### Patient — Données sensibles

Les champs VIH/TB sont ultra-sensibles. En MVP, l'accès est restreint par RBAC (PHARMACIST et DOCTOR uniquement) et les champs sont chiffrés au repos via `pgcrypto`.

```sql
-- Chiffrement des colonnes sensibles via pgcrypto
-- La clé de chiffrement est dans la variable d'environnement ENCRYPTION_KEY
-- Exemple de lecture/écriture dans une vue sécurisée :
UPDATE patients SET
  is_hiv_patient = pgp_sym_encrypt(is_hiv_value::text, current_setting('app.encryption_key')),
  arv_code       = pgp_sym_encrypt(arv_code_value, current_setting('app.encryption_key'))
WHERE id = ?;
```

> **Note honnête** : le chiffrement colonne via `pgcrypto` a un coût en complexité applicative (les colonnes chiffrées ne sont pas cherchables avec `WHERE`). En MVP, l'alternative acceptable est de restreindre l'accès à ces données par RBAC strict + chiffrement complet du disque du serveur. Le chiffrement colonne peut être ajouté en V2 quand la maturité opérationnelle le permet.

#### AuditLog — Journal immuable

```sql
-- Trigger anti-modification
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog est immuable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

### 5.4 Jobs planifiés via `pg_cron`

Pas de processus Node.js séparé pour les jobs en MVP. `pg_cron` est une extension PostgreSQL standard, disponible sur Supabase, RDS, Railway et tout VPS avec PostgreSQL.

```sql
-- Activer pg_cron (une fois, en superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Alerte péremption : chaque jour à 6h00
SELECT cron.schedule('alert-expiry', '0 6 * * *', $$
  INSERT INTO stock_alerts (id, drug_id, batch_id, type, status, message, current_value, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    b.drug_id,
    b.id,
    CASE
      WHEN b.expiry_date < now() THEN 'EXPIRED'
      ELSE 'EXPIRY_SOON'
    END,
    'ACTIVE',
    CASE
      WHEN b.expiry_date < now()
        THEN 'Lot ' || b.batch_number || ' périmé depuis le ' || b.expiry_date::date
      ELSE 'Lot ' || b.batch_number || ' expire dans ' || (b.expiry_date::date - now()::date) || ' jours'
    END,
    (b.expiry_date::date - now()::date),
    now(), now()
  FROM batches b
  WHERE b.is_active = true
    AND b.is_quarantined = false
    AND b.expiry_date <= now() + interval '90 days'
    AND NOT EXISTS (
      SELECT 1 FROM stock_alerts sa
      WHERE sa.batch_id = b.id
        AND sa.type IN ('EXPIRY_SOON', 'EXPIRED')
        AND sa.status = 'ACTIVE'
    );
$$);

-- Alerte stock bas : chaque jour à 6h05
SELECT cron.schedule('alert-low-stock', '5 6 * * *', $$
  INSERT INTO stock_alerts (id, drug_id, type, status, message, threshold, current_value, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    d.id,
    CASE
      WHEN COALESCE(SUM(b.current_quantity), 0) <= d.critical_stock_level THEN 'CRITICAL_STOCK'
      ELSE 'LOW_STOCK'
    END,
    'ACTIVE',
    d.name || ' : stock = ' || COALESCE(SUM(b.current_quantity), 0) || ' unités',
    CASE
      WHEN COALESCE(SUM(b.current_quantity), 0) <= d.critical_stock_level THEN d.critical_stock_level
      ELSE d.min_stock_level
    END,
    COALESCE(SUM(b.current_quantity), 0)::int,
    now(), now()
  FROM drugs d
  LEFT JOIN batches b ON b.drug_id = d.id AND b.is_active = true AND b.is_quarantined = false
  WHERE d.is_active = true
  GROUP BY d.id, d.name, d.min_stock_level, d.critical_stock_level
  HAVING COALESCE(SUM(b.current_quantity), 0) <= d.min_stock_level
    AND NOT EXISTS (
      SELECT 1 FROM stock_alerts sa
      WHERE sa.drug_id = d.id
        AND sa.type IN ('LOW_STOCK', 'CRITICAL_STOCK')
        AND sa.status = 'ACTIVE'
    );
$$);

-- Expiration des ordonnances non servies : chaque jour à 6h10
SELECT cron.schedule('expire-prescriptions', '10 6 * * *', $$
  UPDATE prescriptions
  SET status = 'EXPIRED', updated_at = now()
  WHERE status IN ('PENDING', 'PARTIALLY_DISPENSED')
    AND valid_until IS NOT NULL
    AND valid_until < now();
$$);

-- Purge des sessions expirées : chaque heure
SELECT cron.schedule('purge-sessions', '0 * * * *', $$
  DELETE FROM sessions WHERE expires_at < now() - interval '1 day';
$$);

-- Purge du rate limiting : chaque heure
SELECT cron.schedule('purge-rate-limits', '30 * * * *', $$
  DELETE FROM rate_limit_buckets WHERE window_end < now() - interval '2 hours';
$$);
```

### 5.5 Règles métier — tableau de synthèse

| Règle | Niveau | Implémentation |
|-------|--------|----------------|
| Stock jamais négatif | 🔴 DB | Contrainte `CHECK (quantity_after >= 0)` sur `stock_movements` |
| `StockMovement` immuable | 🔴 DB | Trigger `BEFORE UPDATE OR DELETE` |
| `AuditLog` immuable | 🔴 DB | Trigger `BEFORE UPDATE OR DELETE` |
| `currentQuantity` protégé | 🔴 DB | Trigger `BEFORE UPDATE` sur `batches` |
| Snapshots cohérents | 🔴 DB | `CHECK (quantity_after = quantity_before + quantity)` |
| Lot périmé non dispensable | 🔴 App | Vérification dans `DispensationService` avant création |
| Lot en quarantaine non dispensable | 🔴 App | Vérification dans `DispensationService` |
| Allergie bloquante (ANAPHYLAXIS) | 🔴 App | Vérification dans `DispensationService` + réponse 422 explicite |
| FEFO — lot le plus proche de péremption en premier | 🟠 App | `ORDER BY expiryDate ASC` dans la sélection de lot |
| Stupéfiant → entrée registre | 🟠 App | Si `drug.isControlled`, créer `ControlledDrugEntry` dans la même transaction |
| Ordonnance expirée → statut EXPIRED | 🟡 Job | `pg_cron` quotidien |
| Alerte stock bas | 🟡 Job | `pg_cron` quotidien |
| Alerte péremption | 🟡 Job | `pg_cron` quotidien |
| Audit de toute action métier | 🟠 App | Plugin Fastify `audit.ts` (hook `onResponse`) |

---

## 6. Modules fonctionnels

### 6.1 MVP (v1.0) — 8 semaines

#### Module Auth & Accès

- Login / logout avec JWT (access 15min, refresh 30j en httpOnly cookie)
- Refresh token stocké en table `Session` (révocable individuellement)
- Rôles actifs en MVP : `SUPERADMIN`, `PHARMACIST`, `PHARMACY_TECH`, `DOCTOR`, `NURSE`, `CASHIER`
- Changement de mot de passe obligatoire à la première connexion (`mustChangePassword`)
- Verrouillage compte après 5 échecs (`failedLoginCount`, `lockedUntil`)
- Rate limiting sur `/auth/login` : 10 tentatives / 15 min / IP (table PostgreSQL)

#### Module Référentiel Médicaments

- CRUD médicaments (code, nom, DCI, forme, dosage, catégorie)
- Marquage médicaments essentiels et contrôlés
- Gestion des seuils de stock (min, critique, point de commande)
- Recherche par nom, DCI, code (index PostgreSQL `gin` ou `pg_trgm` pour fuzzy search)
- Import CSV initial pour charger le formulaire existant de l'hôpital

#### Module Stock & Lots

- Réception d'un lot : création `Batch` + mouvement `RECEPTION`
- Vue stock par médicament (somme des `currentQuantity` des lots actifs non périmés non en quarantaine)
- Mise en quarantaine d'un lot (avec motif obligatoire)
- Retrait pour péremption : mouvement `EXPIRY_REMOVAL`
- Tableau de bord : alertes actives, lots expirant dans 30j, stock critique

#### Module Patients

- Création / édition fiche patient (nom, numéro dossier, téléphone, allergies)
- Enregistrement des allergies avec sévérité (enum `AllergySeverity`)
- Historique des dispensations par patient
- Champs VIH/TB : présents en base, UI accessible uniquement PHARMACIST + DOCTOR

#### Module Ordonnances & Dispensation

- Création ordonnance par DOCTOR (ou PHARMACIST avec `prescribedById` pointant le médecin)
- Dispensation avec sélection automatique FEFO du lot
- Vérification allergies bloquante (`ANAPHYLAXIS` = rejet) + avertissement (`SEVERE`, `MODERATE`)
- Vérification interactions médicamenteuses (alerte non bloquante en MVP si table `DrugInteraction` vide)
- Paiement multi-modes : CASH_CDF, CASH_USD, MOBILE_MONEY, INSURANCE, ONG_COVERAGE, CREDIT, FREE
- Génération reçu (impression navigateur ou PDF via `@react-pdf/renderer`)

#### Module Alertes

- Liste des alertes actives avec filtres (type, statut, médicament)
- Prise en charge d'une alerte (`ACKNOWLEDGED`) avec commentaire
- Résolution (`RESOLVED`) ou mise à l'écart (`IGNORED`, commentaire obligatoire)

#### Module Rapports basiques

- Stock actuel par médicament (quantité disponible, valeur estimée)
- Consommation par période (par médicament, par catégorie)
- Péremptions dans les 90 prochains jours
- Dispensations par période (par patient, par médicament, par pharmacien)
- Export CSV pour tous les rapports

### 6.2 V2 — après retours terrain (3–6 mois)

| Module | Tables concernées | Déclencheur terrain |
|--------|-------------------|---------------------|
| Commandes fournisseurs | `PurchaseOrder`, `PurchaseOrderLine` | Ruptures fréquentes sans anticipation |
| Inventaire physique | `PhysicalInventory`, `InventoryLine` | Écarts constatés entre stock système et physique |
| Usage interne | `InternalUsage`, `InternalUsageLine` | Soins infirmiers et bloc demandent une traçabilité |
| Chaîne du froid | `ColdChainLog` | Problèmes qualité sur vaccins ou injectables |
| Registre stupéfiants (UI) | `ControlledDrugEntry` | Inspection DPLM |
| Assurances | `Insurance`, champ `insuranceId` sur `Patient` | Volume de patients assurés significatif |
| Substitution médicaments | `DrugSubstitute` (UI) | Ruptures gérées manuellement |
| Transferts inter-services | `TransferOrder`, `TransferOrderLine` | Services demandent des transferts depuis la pharmacie |

### 6.3 V3+ — évolution à 12+ mois

- Multi-sites avec transferts inter-pharmacies
- Analytics avancés (tendances consommation, prédictions réapprovisionnement)
- Application mobile React Native (agents de terrain, programmes verticaux)
- Intégration SIH via API FHIR R4 (si l'hôpital dispose d'un SIH)
- WebSockets pour tableau de bord temps réel (là, Redis devient pertinent)

---

## 7. Sécurité

### 7.1 Authentification & Autorisation

| Couche | Mesure | Détail |
|--------|--------|--------|
| Mots de passe | **Argon2id** | Paramètres : memory=65536, iterations=3, parallelism=4 |
| Access token | **JWT HS256**, durée 15min | Payload : `userId`, `role`, `iat`, `exp` — rien d'autre |
| Refresh token | Token aléatoire 256 bits, hash SHA-256 en base | Stocké dans `Session.tokenHash` ; token brut en httpOnly cookie |
| Révocation session | Suppression ou `revokedAt` sur `Session` | Permet révocation granulaire (ex: déconnexion d'un appareil) |
| RBAC | Vérification du rôle sur chaque route dans le plugin `rbac.ts` | Pas de logique d'autorisation dans les contrôleurs |
| Verrouillage | 5 échecs → `lockedUntil = now() + 15min` | Reset automatique après le délai |

**Matrice RBAC simplifiée (MVP) :**

| Action | SUPERADMIN | PHARMACIST | PHARMACY_TECH | DOCTOR | NURSE | CASHIER |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| Gérer les utilisateurs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CRUD médicaments | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Réceptionner un lot | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Créer ordonnance | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Dispenser | ✅ | ✅ | ✅ | ❌ | ⚠️ urgence | ❌ |
| Voir stock | ✅ | ✅ | ✅ | 👁️ lecture | 👁️ lecture | ❌ |
| Voir données VIH/TB patient | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Rapports | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ caisse |
| Config système | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 7.2 Protection des données

| Mesure | Application |
|--------|-------------|
| **HTTPS obligatoire** | Caddy force HTTPS, HTTP redirigé automatiquement |
| **httpOnly cookies** | Refresh token jamais accessible depuis JavaScript |
| **Chiffrement disque** | Chiffrement complet du volume serveur (LUKS sur VPS Hetzner) |
| **Colonnes sensibles** | `pgcrypto` sur champs VIH/TB — accès conditionnel par RBAC (MVP : RBAC strict + chiffrement disque ; `pgcrypto` en V2) |
| **Logs sans PII** | `AuditLog.changes` ne contient jamais de noms, noms, numéros de dossier — uniquement des IDs |
| **Backup chiffré** | `pg_dump` chiffré avec GPG avant envoi vers stockage distant |

### 7.3 Rate Limiting (sans Redis)

Table `rate_limit_buckets` en PostgreSQL — simple et suffisant pour le traffic MVP d'un hôpital.

```sql
CREATE TABLE rate_limit_buckets (
  key         TEXT NOT NULL,           -- format: "ip:{ip}:{endpoint}"
  window_end  TIMESTAMPTZ NOT NULL,
  count       INT NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_end)
);

CREATE INDEX idx_rlb_window_end ON rate_limit_buckets (window_end);
```

Logique dans le plugin `rateLimit.ts` :
- Fenêtre glissante de 15 minutes
- Limite : 10 requêtes / fenêtre sur `/auth/login`, `/auth/refresh`
- Limite générale : 300 requêtes / minute / IP (toutes routes)
- `pg_cron` purge les entrées expirées toutes les heures

### 7.4 Audit

Le plugin `audit.ts` est un hook Fastify `onResponse` qui persiste un `AuditLog` pour toutes les actions mutantes (POST, PUT, PATCH, DELETE) sur les ressources métier.

```typescript
// plugins/audit.ts (pseudo-code)
fastify.addHook('onResponse', async (request, reply) => {
  if (!AUDITABLE_METHODS.includes(request.method)) return;
  if (reply.statusCode >= 400) return; // On n'audite pas les erreurs

  await prisma.auditLog.create({
    data: {
      userId: request.user?.id ?? null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      action: `${request.method}_${routeToAction(request.routerPath)}`,
      entity: routeToEntity(request.routerPath),
      entityId: reply.context?.entityId ?? null,
      changes: reply.context?.auditChanges ?? null, // jamais de PII ici
    }
  });
});
```

### 7.5 Conformité RDC

| Obligation | Statut MVP | Note |
|------------|------------|------|
| Traçabilité des stupéfiants | ✅ `ControlledDrugEntry` créé automatiquement | UI registre en V2 |
| Conservation des registres | ✅ Audit log immuable (trigger DB) | |
| Reporting Ministère Santé | ⏸️ V2 | Export formats officiels à définir avec DPLM |
| Protection données patients | ✅ RBAC + chiffrement disque | `pgcrypto` colonnes en V2 |
| Double signature stupéfiants | ✅ Champ `counterSignedById` en base | UI validation en V2 |

---

## 8. Structure du projet

### 8.1 Backend (`apps/api/src/`)

```
api/src/
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts          ← routes Fastify + schémas Zod inline
│   │   ├── auth.service.ts         ← logique : hash, JWT, session
│   │   └── auth.test.ts
│   ├── drug/
│   │   ├── drug.routes.ts
│   │   ├── drug.service.ts
│   │   └── drug.test.ts
│   ├── stock/
│   │   ├── stock.routes.ts
│   │   ├── stock.service.ts        ← FEFO, règles métier, création mouvements
│   │   └── stock.test.ts
│   ├── dispensation/
│   │   ├── dispensation.routes.ts
│   │   ├── dispensation.service.ts ← vérif allergies, interactions, lot, transaction Prisma
│   │   └── dispensation.test.ts
│   ├── patient/
│   │   ├── patient.routes.ts
│   │   ├── patient.service.ts
│   │   └── patient.test.ts
│   ├── prescription/
│   │   ├── prescription.routes.ts
│   │   └── prescription.service.ts
│   ├── alert/
│   │   ├── alert.routes.ts
│   │   └── alert.service.ts        ← lecture + gestion statut alertes
│   └── report/
│       ├── report.routes.ts
│       └── report.service.ts       ← requêtes SQL analytiques via Prisma.$queryRaw
│
├── plugins/
│   ├── prisma.ts                   ← décorateur instance Prisma sur fastify
│   ├── auth.ts                     ← vérification JWT + injection request.user
│   ├── rbac.ts                     ← vérification rôle selon la route
│   ├── rateLimit.ts                ← rate limiting via table PostgreSQL
│   └── audit.ts                    ← hook onResponse → AuditLog
│
├── lib/
│   ├── errors.ts                   ← AppError, NotFoundError, ForbiddenError, ValidationError
│   ├── constants.ts                ← FEFO_QUERY, EXPIRY_WARNING_DAYS, etc.
│   ├── crypto.ts                   ← hash Argon2id, vérification, génération tokens
│   └── utils.ts
│
└── app.ts                          ← enregistrement plugins + modules
```

### 8.2 Frontend (`apps/web/src/`)

```
web/src/
├── app/                            ← App Router Next.js
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── change-password/page.tsx
│   ├── (app)/                      ← layout protégé (middleware vérifie le token)
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx      ← alertes actives, activité récente, stock critique
│   │   ├── stock/
│   │   │   ├── page.tsx            ← liste médicaments + stock disponible
│   │   │   └── [drugId]/page.tsx   ← détail + lots actifs
│   │   ├── dispensation/
│   │   │   ├── page.tsx            ← liste dispensations
│   │   │   └── new/page.tsx        ← formulaire dispensation
│   │   ├── prescription/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── patient/
│   │   │   ├── page.tsx
│   │   │   └── [patientId]/page.tsx
│   │   ├── reports/page.tsx
│   │   └── admin/
│   │       ├── users/page.tsx
│   │       ├── drugs/page.tsx
│   │       └── config/page.tsx
│   └── api/                        ← Route handlers Next.js (proxy auth si besoin)
│
├── components/
│   ├── ui/                         ← shadcn/ui (Button, Input, Table, Dialog…)
│   ├── forms/
│   │   ├── DispensationForm.tsx    ← formulaire principal dispensation
│   │   ├── PrescriptionForm.tsx
│   │   └── PatientForm.tsx
│   ├── stock/
│   │   ├── StockTable.tsx
│   │   ├── BatchCard.tsx
│   │   └── AlertBadge.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Header.tsx
│
├── hooks/
│   ├── useAuth.ts                  ← lecture store + refresh automatique
│   ├── useDrugs.ts                 ← TanStack Query wrapper
│   ├── useStock.ts
│   └── useDispensation.ts
│
├── lib/
│   ├── api.ts                      ← client fetch typé (avec refresh token auto)
│   ├── queryClient.ts              ← config TanStack Query
│   └── offline.ts                  ← logique IndexedDB (drugs + stock pour offline)
│
└── stores/
    └── authStore.ts                ← Zustand : user, role, tokens
```

---

## 9. CI/CD et qualité

### 9.1 Pipeline GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: pharmacie_test
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:test_password@localhost:5432/pharmacie_test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter database prisma migrate deploy
      - run: pnpm test

  build:
    needs: [lint-and-typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

> **Note** : plus de service `redis` dans le CI — une ligne de moins, une dépendance de moins à maintenir.

### 9.2 Tests prioritaires

| Test | Priorité | Implémentation |
|------|----------|----------------|
| Stock jamais négatif | 🔴 Critique | Test unitaire `StockService` + test intégration sur la contrainte DB |
| Dispensation lot périmé rejetée | 🔴 Critique | Test intégration avec lot périmé en fixture |
| Dispensation lot en quarantaine rejetée | 🔴 Critique | Test intégration |
| Allergie ANAPHYLAXIS bloquante | 🔴 Critique | Test unitaire `DispensationService` |
| `StockMovement` immuable | 🔴 Critique | Test que le trigger PostgreSQL lève une exception |
| `AuditLog` immuable | 🔴 Critique | Test que le trigger PostgreSQL lève une exception |
| RBAC — médecin ne peut pas modifier le stock | 🟠 Haute | Test route avec token rôle DOCTOR → 403 |
| Refresh token révocable | 🟠 Haute | Test logout + tentative refresh → 401 |
| FEFO respecté | 🟠 Haute | Test avec 2 lots, péremptions différentes — vérifier lequel est sélectionné |
| Alertes générées par pg_cron | 🟡 Moyenne | Test SQL direct sur la requête du job |

### 9.3 Qualité de code

| Outil | Usage |
|-------|-------|
| **ESLint** + règles `@typescript-eslint/strict` | Erreurs TypeScript = erreurs de lint |
| **Prettier** | Formatage, pas de débat |
| **TypeScript `strict: true`** | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| **Vitest** | Tests unitaires et intégration |
| **Playwright** | Tests E2E sur les parcours critiques (login, dispensation complète) |

---

## 10. Observabilité

### 10.1 Logs

Pino est natif à Fastify — rien à installer de plus.

```json
{
  "level": "info",
  "msg": "Dispensation créée",
  "dispensationId": "cld8x2...",
  "userId": "cld7k1...",
  "patientId": "cld5m3...",
  "timestamp": "2026-06-21T08:15:00Z"
}
```

Règle : jamais de nom, prénom, numéro de dossier, ou donnée médicale dans les logs — uniquement des IDs.

Agrégation en MVP : **Logtail** (plan gratuit généreux) ou fichiers rotatifs sur le serveur avec `logrotate`.

### 10.2 Erreurs

**Sentry** — plan gratuit (5000 événements/mois). Intégration Fastify native.

### 10.3 Monitoring

| Outil | Usage |
|-------|-------|
| **UptimeRobot** (plan gratuit) | Ping toutes les 5 min — alerte SMS/email si down |
| **pg_stat_statements** | Analyse des requêtes lentes (activer en production, consulter via `pgAdmin`) |

### 10.4 Alertes ops

- CPU > 80% pendant 5 min → notification
- Mémoire > 85% → notification
- Disque > 80% → notification (avant 90% — marge pour agir)
- Connexions DB > 80% du pool → notification

---

## 11. Plan de lancement

### Phase 1 — Fondations (Semaines 1–2)

- [ ] Setup monorepo (pnpm workspaces + Turbo)
- [ ] `docker-compose.yml` avec PostgreSQL uniquement
- [ ] Extension `pg_cron` installée et testée
- [ ] Schéma Prisma complet déployé en migration initiale (toutes les tables, V2 inclus)
- [ ] Seed initial : `SystemConfig`, utilisateur `SUPERADMIN`
- [ ] Plugin Fastify : Prisma, auth JWT, RBAC, audit, rate limiting DB
- [ ] Module Auth complet (login, refresh, logout, change-password)
- [ ] **Atelier avec le pharmacien référent** : validation des workflows réels (2h)

### Phase 2 — Référentiel & Stock (Semaines 3–4)

- [ ] CRUD `Drug` + `Supplier` (basique)
- [ ] Réception de lots (`Batch` + mouvement `RECEPTION`)
- [ ] Quarantaine et retrait de lot
- [ ] Tableau de bord stock (quantités disponibles, alertes actives)
- [ ] Jobs `pg_cron` : alertes péremption + stock bas
- [ ] Tests unitaires `StockService`
- [ ] Trigger PostgreSQL `StockMovement` immuable + `currentQuantity` protégé

### Phase 3 — Patients & Dispensation (Semaines 5–6)

- [ ] CRUD `Patient` + `PatientAllergy`
- [ ] Création `Prescription` + `PrescriptionLine`
- [ ] `DispensationService` avec toutes les vérifications (péremption, quarantaine, allergie, stock)
- [ ] Sélection FEFO automatique du lot
- [ ] Paiement multi-modes
- [ ] Reçu de caisse (impression navigateur)
- [ ] Création automatique `ControlledDrugEntry` pour stupéfiants

### Phase 4 — Rapports & Alertes UI (Semaine 7)

- [ ] Page alertes avec gestion de statut
- [ ] Rapport stock actuel (avec export CSV)
- [ ] Rapport consommation par période
- [ ] Rapport péremptions < 90j
- [ ] Rapport dispensations
- [ ] Dashboard principal (alertes critiques, activité récente, stock sous seuil)

### Phase 5 — Hardening & Déploiement (Semaine 8)

- [ ] Tests d'intégration complets (parcours dispensation de bout en bout)
- [ ] Tests Playwright (login, dispensation, rapport)
- [ ] Audit RBAC : tester chaque rôle sur les routes sensibles
- [ ] Backup automatisé : `pg_dump` chiffré via `pg_cron` → Backblaze B2 ou S3
- [ ] Déploiement sur VPS Hetzner + Caddy (HTTPS automatique)
- [ ] `pg_stat_statements` activé — identifier les requêtes lentes avec données réelles
- [ ] **Formation utilisateurs** (pharmaciens, techniciens) — minimum 4h

### Phase 6 — Production

- [ ] Déploiement en production
- [ ] Migration des données existantes (si registre papier à numériser)
- [ ] Support intensif sur place les 2 premières semaines
- [ ] Collecte des retours terrain → priorisation V2

---

## 12. Points critiques

### 12.1 À ne jamais négliger

| # | Point | Impact si ignoré |
|---|-------|------------------|
| 1 | **Valider les workflows avec un pharmacien avant de coder** | Refonte coûteuse ; adoption nulle si le logiciel ne correspond pas à la réalité terrain |
| 2 | **Backup automatisé dès le jour 1** | Perte totale des données sur panne ou vol du serveur |
| 3 | **Offline-first testé sur réseau réel** | Blocage complet de la pharmacie lors des coupures (fréquentes) |
| 4 | **Les triggers DB sont non négociables** | Sans eux, un bug applicatif peut créer des données incohérentes impossibles à réconcilier |
| 5 | **Ne jamais exposer les données VIH/TB sans vérification RBAC** | Conséquences légales, stigmatisation, violation de confiance patient |
| 6 | **Tester le verrouillage de compte** | Sans verrouillage, attaque par force brute sur un terminal laissé sans surveillance |

### 12.2 Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Coupure électrique fréquente | Élevée | Critique | UPS sur le serveur + PWA offline (IndexedDB) + `synchronous_commit = local` sur PostgreSQL |
| Connexion internet instable | Élevée | Haute | PWA avec sync différée, application fonctionnelle entièrement en offline pour les opérations courantes |
| Résistance au changement | Moyenne | Haute | Implication du pharmacien dès la conception ; UX simplifiée ; formation progressive |
| Complexité réglementaire RDC | Moyenne | Haute | Consultation DPLM avant mise en production ; double signature stupéfiants dans le schéma |
| Taux de change CDF/USD volatile | Élevée | Moyenne | Les deux devises sont stockées sur chaque transaction ; jamais de conversion calculée à la volée sans taux de référence |
| Perte du seul PC de la pharmacie | Faible | Critique | Backup quotidien + procédure de restauration documentée et testée |

### 12.3 Hypothèses

- L'hôpital dispose d'au moins un poste informatique dédié à la pharmacie, avec un navigateur moderne
- Un pharmacien est disponible minimum 2h/semaine pour valider les workflows pendant le développement
- Le SIH hospitalier (s'il existe) n'est pas intégré en MVP
- Les fournisseurs acceptent les commandes par téléphone/email en V1 (pas d'EDI)
- Le serveur est hébergé sur site ou chez un hébergeur accessible depuis l'hôpital

---

## 13. Annexes

### Annexe A : Glossaire

| Terme | Définition |
|-------|------------|
| **AMM** | Autorisation de Mise sur le Marché |
| **DCI** | Dénomination Commune Internationale |
| **DPLM** | Direction de la Pharmacie et du Médicament (RDC) |
| **FEFO** | First Expired First Out — le lot dont la péremption est la plus proche est servi en premier |
| **pg_cron** | Extension PostgreSQL pour planifier des requêtes SQL (remplace Redis/BullMQ en MVP) |
| **RBAC** | Role-Based Access Control |
| **SIH** | Système d'Information Hospitalier |
| **Stupéfiant** | Médicament soumis à contrôle spécial (armoire sécurisée, registre obligatoire, double signature) |

### Annexe B : Enums du système (issus du schéma Prisma v2.0)

#### UserRole
`SUPERADMIN` `PHARMACIST` `PHARMACY_TECH` `DOCTOR` `NURSE` `CASHIER` `STOCK_MANAGER` `AUDITOR`

#### MovementType
`RECEPTION` `DONATION_IN` `TRANSFER_IN` `DISPENSATION_OUT` `INTERNAL_USE` `TRANSFER_OUT` `DONATION_OUT` `EXPIRY_REMOVAL` `LOSS` `INVENTORY_POSITIVE` `INVENTORY_NEGATIVE` `RETURN_TO_SUPPLIER` `RETURN_FROM_PATIENT`

#### PrescriptionStatus
`DRAFT` `PENDING` `PARTIALLY_DISPENSED` `DISPENSED` `CANCELLED` `EXPIRED`

#### AlertType
`LOW_STOCK` `CRITICAL_STOCK` `EXPIRY_SOON` `EXPIRED` `COLD_CHAIN_BREACH` `CONTROLLED_REORDER` `INVENTORY_DISCREPANCY` `LICENSE_EXPIRY`

#### PaymentMethod
`CASH_CDF` `CASH_USD` `MOBILE_MONEY` `INSURANCE` `ONG_COVERAGE` `CREDIT` `FREE`

#### AllergySeverity
`MILD` `MODERATE` `SEVERE` `ANAPHYLAXIS`

### Annexe C : Configuration système initiale (`SystemConfig`)

Insérer via le seed Prisma (`prisma/seed.ts`) :

| Clé | Valeur par défaut | Description |
|-----|-------------------|-------------|
| `hospital.name` | `"Hôpital"` | Affiché sur les reçus et rapports |
| `hospital.province` | `"Kinshasa"` | Province de l'établissement |
| `currency.primary` | `"CDF"` | Devise principale d'affichage |
| `currency.secondary` | `"USD"` | Devise secondaire |
| `alert.expiryWarningDays` | `"90"` | Jours avant péremption pour déclencher EXPIRY_SOON |
| `alert.criticalExpiryDays` | `"30"` | Seuil pour alerte critique péremption |
| `alert.lowStockEnabled` | `"true"` | Activer les alertes stock bas |
| `session.accessTokenTtlMin` | `"15"` | Durée access token JWT en minutes |
| `session.refreshTokenTtlDays` | `"30"` | Durée refresh token en jours |
| `prescription.validityDays` | `"3"` | Validité d'une ordonnance non servie (jours) |
| `dispensation.allowWithoutRx` | `"false"` | Autoriser dispensation sans ordonnance |
| `controlled.requireDualSign` | `"true"` | Double signature obligatoire pour les stupéfiants |
| `controlled.schedulesDualSign` | `"I,II"` | Tableaux stupéfiants concernés par la double signature |
| `coldChain.alertTempMax` | `"8"` | Température max chaîne du froid (°C) |
| `coldChain.alertTempMin` | `"2"` | Température min chaîne du froid (°C) |

### Annexe D : Variables d'environnement requises

```bash
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/pharmacie_prod"

# JWT
JWT_SECRET="chaîne aléatoire >= 64 caractères — générer avec: openssl rand -base64 64"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_DAYS="30"

# Chiffrement données sensibles
ENCRYPTION_KEY="chaîne aléatoire >= 32 caractères — générer avec: openssl rand -base64 32"

# App
NODE_ENV="production"
PORT="3001"
API_URL="https://pharmacie.votre-hopital.cd"

# Sentry (optionnel mais recommandé)
SENTRY_DSN="https://..."

# Backblaze B2 ou S3 pour les backups
B2_KEY_ID="..."
B2_APP_KEY="..."
B2_BUCKET_NAME="pharmacie-backups"
```

### Annexe E : Script de backup quotidien

```bash
#!/bin/bash
# /etc/cron.d/pharmacie-backup (ou via pg_cron pour lancer le script)
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/pharmacie_backup_${DATE}.sql.gz"
GPG_KEY="votre-cle-gpg-id"

# Dump + compression
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# Chiffrement
gpg --recipient "$GPG_KEY" --output "${BACKUP_FILE}.gpg" --encrypt "$BACKUP_FILE"
rm "$BACKUP_FILE"

# Upload Backblaze B2
b2 upload-file "$B2_BUCKET_NAME" "${BACKUP_FILE}.gpg" "backups/$(basename ${BACKUP_FILE}.gpg)"
rm "${BACKUP_FILE}.gpg"

echo "Backup $DATE terminé avec succès"
```

---

*Document v2.0 — 21 juin 2026 — RAMAZANI SUMAILI Daniel Herman*
*Prochaine révision : après la Phase 1 (validation pharmacien) ou sur changement de périmètre significatif.*
