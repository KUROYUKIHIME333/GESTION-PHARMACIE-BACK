
═══════════════════════════════════════════════════════════════════════════════
                    PLAN MVP 7 JOURS — PHARMACIE HOSPITALIÈRE
                    2 Développeurs Full Stack | 14 jours-homme
═══════════════════════════════════════════════════════════════════════════════

# MVP RETENU (Périmètre minimal viable)

## Objectif métier
Un pharmacien peut :
1. Se connecter au système
2. Gérer le référentiel médicaments (CRUD basique)
3. Réceptionner des lots de médicaments
4. Voir le stock disponible par médicament
5. Créer une fiche patient
6. Créer une ordonnance
7. Dispenser des médicaments (avec sélection FEFO automatique)
8. Voir l'historique des dispensations
9. Recevoir des alertes visuelles basiques (stock bas, péremption proche)

## Ce qui EST dans le MVP

### Backend (Fastify + Prisma + PostgreSQL)
- Auth : login simple avec bcrypt, session JWT basique (pas de refresh token complexe)
- CRUD Drug (référentiel)
- CRUD Batch (réception de lots)
- Stock : vue agrégée par médicament
- CRUD Patient
- CRUD Prescription + PrescriptionLine
- Dispensation avec sélection FEFO automatique du lot
- StockMovement créé automatiquement à chaque dispensation
- Alertes : endpoint qui liste les alertes (calculées à la volée, pas de pg_cron)
- AuditLog basique (log des actions POST/PUT/DELETE)

### Frontend (Next.js + Tailwind + shadcn/ui)
- Page Login
- Dashboard (alertes visuelles, stock critique, activité récente)
- Page Médicaments (liste + détail + CRUD)
- Page Stock (vue par médicament avec lots)
- Page Réception Lot (formulaire)
- Page Patients (liste + CRUD)
- Page Ordonnances (liste + création)
- Page Dispensation (formulaire avec sélection auto lot)
- Page Historique Dispensations

### Base de données
- Schéma Prisma complet déployé (toutes les tables, même V2/V3)
- Seed : 1 admin, quelques médicaments de test, config système

### Déploiement
- Docker Compose local (PostgreSQL)
- Build et déploiement manuel sur VPS
- Caddy reverse proxy + HTTPS
- Backup pg_dump manuel (script prêt)

═══════════════════════════════════════════════════════════════════════════════
# FONCTIONNALITÉS SUPPRIMÉES OU REPORTÉES

## Supprimées du MVP

| # | Fonctionnalité | Raison | Report |
|---|----------------|--------|--------|
| 1 | PWA Offline-first | Complexité élevée | Semaine 2 |
| 2 | pg_cron alertes automatiques | Config ops | Semaine 2 |
| 3 | Refresh token révocation | Sur-ingénierie auth | Semaine 2 |
| 4 | Rate limiting PostgreSQL | Pas critique | Semaine 3 |
| 5 | Chiffrement pgcrypto VIH/TB | Complexité ops | Semaine 3 |
| 6 | Tests E2E Playwright | Trop longs | Semaine 2 |
| 7 | Tests unitaires complets | Priorité features | Semaine 2 |
| 8 | CI/CD GitHub Actions | Pas nécessaire | Semaine 2 |
| 9 | Sentry / Logtail / UptimeRobot | Pas critique | Semaine 2 |
| 10 | Import CSV médicaments | Manuel suffit | Semaine 2 |
| 11 | Génération PDF reçu | Navigateur suffit | Semaine 2 |
| 12 | Multi-devises conversion | Afficher les deux | Semaine 2 |
| 13 | Chaîne du froid | Pas critique | Semaine 3 |
| 14 | Registre stupéfiants UI | UI complexe | Semaine 2 |
| 15 | Transferts inter-services | Pas utilisé | Semaine 3 |
| 16 | Inventaire physique | Pas critique | Semaine 3 |
| 17 | Commandes fournisseurs | Hors système V1 | Semaine 2 |
| 18 | Usage interne | Temporairement dispensé | Semaine 3 |
| 19 | Assurances UI complète | Champ présent | Semaine 2 |
| 20 | DrugSubstitute/Interaction | Pas critique | Semaine 3 |
| 21 | AuditLog trigger DB immuable | Log applicatif suffit | Semaine 2 |
| 22 | Verrouillage compte | Log manuel | Semaine 2 |
| 23 | Double signature stupéfiants | Champ en base | Semaine 2 |
| 24 | Sessions multiples | 1 session suffit | Semaine 2 |
| 25 | Fuzzy search pg_trgm | LIKE suffisant | Semaine 2 |

## Simplifications acceptées

| Domaine | Original | MVP |
|---------|----------|-----|
| Auth | JWT 15min + refresh 30j + révocation | JWT simple 24h, 1 session |
| Alertes | pg_cron quotidien + table StockAlert | Calcul à la volée endpoint |
| Audit | Trigger DB immuable + AuditLog complet | Middleware Fastify |
| Stock | Trigger DB protégeant currentQuantity | Vérification applicative + CHECK |
| FEFO | Algo complexe | ORDER BY expiryDate ASC |
| Paiement | Multi-modes encaissement | Champ paymentMethod + montant |
| RBAC | Vérification chaque route | Middleware simple rôle minimum |
| Backup | pg_cron + upload B2 | Script shell manuel |
| Déploiement | Docker + Caddy auto | Build manuel, scp, Caddy manuel |

═══════════════════════════════════════════════════════════════════════════════
# ARCHITECTURE TECHNIQUE (MVP simplifiée)

## Stack
- Backend : Node.js 20 + Fastify 4 + TypeScript + Prisma + PostgreSQL 15
- Frontend : Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Auth : JWT simple (jsonwebtoken), bcrypt, durée 24h
- State : React Context
- Forms : React Hook Form + Zod
- DB : PostgreSQL via Docker Compose
- Déploiement : VPS Hetzner/Railway + Caddy

## Structure projet
```
pharmacie-mvp/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── lib/
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── hooks/
│   └── package.json
└── docker-compose.yml
```

## Modèles DB utilisés en MVP
User, HospitalService, Drug, Supplier, Batch, StorageLocation, StockMovement, Patient, PatientAllergy, Prescription, PrescriptionLine, Dispensation, DispensationLine, StockAlert, AuditLog, SystemConfig

## Modèles créés mais NON utilisés en MVP
Insurance, ColdChainLog, InternalUsage, TransferOrder, PurchaseOrder, PhysicalInventory, ControlledDrugEntry, DrugSubstitute, DrugInteraction, Session

═══════════════════════════════════════════════════════════════════════════════
# JOUR 1 — FONDATIONS

## Objectif : Projet structuré, DB opérationnelle, auth basique

### DEV A — Backend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 1.1 | Setup Node.js + TypeScript + Fastify + Prisma | 1.5h |
| 1.2 | docker-compose.yml PostgreSQL | 0.5h |
| 1.3 | Migration initiale schéma complet | 1h |
| 1.4 | Seed.ts (admin, 5 médicaments, config) | 1h |
| 1.5 | Prisma client singleton | 0.5h |
| 1.6 | Auth register + login (bcrypt + JWT) | 2h |
| 1.7 | Middleware auth JWT | 1h |
| 1.8 | Middleware RBAC basique | 0.5h |

**Livrable** : API auth fonctionnelle, DB seedée

### DEV B — Frontend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 1.1 | Setup Next.js 14 + Tailwind + shadcn/ui | 1.5h |
| 1.2 | Structure dossiers | 0.5h |
| 1.3 | Client API fetch | 0.5h |
| 1.4 | Context Auth | 1h |
| 1.5 | Page Login | 1.5h |
| 1.6 | Layout protégé | 1h |
| 1.7 | Sidebar navigation | 1h |
| 1.8 | Page Dashboard vide | 1h |

**Livrable** : Frontend login fonctionnel, layout, navigation

**Sync soir** : Test end-to-end login

═══════════════════════════════════════════════════════════════════════════════
# JOUR 2 — RÉFÉRENTIEL + STOCK

## Objectif : CRUD médicaments et lots, vue stock

### DEV A — Backend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 2.1 | Routes CRUD Drug | 2h |
| 2.2 | Routes CRUD Batch | 2h |
| 2.3 | Route GET /stock (agrégation) | 1.5h |
| 2.4 | Route GET /stock/:drugId | 1h |
| 2.5 | Schémas Zod Drug, Batch | 1h |
| 2.6 | Middleware audit basique | 0.5h |

**Livrable** : API drugs, batches, stock

### DEV B — Frontend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 2.1 | Page Médicaments liste | 2h |
| 2.2 | Formulaire création/édition médicament | 2h |
| 2.3 | Page Stock | 2h |
| 2.4 | Page Réception Lot | 1.5h |
| 2.5 | Suppression médicament | 0.5h |

**Livrable** : UI médicaments et stock

**Sync soir** : Test CRUD médicaments + réception lot

═══════════════════════════════════════════════════════════════════════════════
# JOUR 3 — PATIENTS + ORDONNANCES

## Objectif : Fiches patients et ordonnances créables

### DEV A — Backend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 3.1 | Routes CRUD Patient | 2h |
| 3.2 | Routes CRUD PatientAllergy | 1h |
| 3.3 | Routes CRUD Prescription | 2h |
| 3.4 | Routes PrescriptionLine | 1.5h |
| 3.5 | Route GET /prescriptions/:id | 1h |
| 3.6 | Schémas Zod | 0.5h |

**Livrable** : API patients et ordonnances

### DEV B — Frontend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 3.1 | Page Patients liste | 2h |
| 3.2 | Formulaire patient | 1.5h |
| 3.3 | Page détail patient | 1.5h |
| 3.4 | Page Ordonnances liste | 1h |
| 3.5 | Formulaire ordonnance | 2h |

**Livrable** : UI patients et ordonnances

**Sync soir** : Test patient + ordonnance

═══════════════════════════════════════════════════════════════════════════════
# JOUR 4 — DISPENSATION (CŒUR)

## Objectif : Dispenser avec FEFO automatique

### DEV A — Backend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 4.1 | Service FEFO sélection lot | 2h |
| 4.2 | Vérifications dispensation | 1.5h |
| 4.3 | Transaction Dispensation + StockMovement | 2h |
| 4.4 | Route POST /dispensations | 1h |
| 4.5 | Route GET /dispensations | 0.5h |
| 4.6 | Route GET /dispensations/:id | 0.5h |
| 4.7 | Vérification allergies | 0.5h |

**Livrable** : API dispensation FEFO

### DEV B — Frontend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 4.1 | Page Dispensation formulaire | 2.5h |
| 4.2 | Affichage lot FEFO choisi | 1.5h |
| 4.3 | Alertes allergies | 1h |
| 4.4 | Page Historique Dispensations | 2h |
| 4.5 | Dashboard alertes + stock critique | 1h |

**Livrable** : UI dispensation, dashboard

**Sync soir** : Test dispensation complète

═══════════════════════════════════════════════════════════════════════════════
# JOUR 5 — ALERTES + RAFFINEMENT

## Objectif : Alertes fonctionnelles, polish, corrections

### DEV A — Backend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 5.1 | Endpoint GET /alerts (calcul à la volée) | 2h |
| 5.2 | Endpoint POST /alerts/:id/acknowledge | 1h |
| 5.3 | Route GET /dashboard/stats | 1.5h |
| 5.4 | Corrections bugs J1-J4 | 2h |
| 5.5 | Validation métier renforcée | 1h |
| 5.6 | Seed enrichi | 0.5h |

**Livrable** : Alertes, backend stable

### DEV B — Frontend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 5.1 | Alertes Dashboard | 1.5h |
| 5.2 | Page Alertes | 1.5h |
| 5.3 | Polish UI responsive/erreurs | 2h |
| 5.4 | Corrections bugs | 2h |
| 5.5 | Page reçu imprimable | 1h |

**Livrable** : UI polie, alertes, reçu

**Sync soir** : Test parcours complet

═══════════════════════════════════════════════════════════════════════════════
# JOUR 6 — DÉPLOIEMENT + TESTS

## Objectif : Déployer sur VPS, tests production

### DEV A — Backend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 6.1 | Build production backend | 1h |
| 6.2 | Script déploiement scp+ssh | 1h |
| 6.3 | Déploiement VPS | 1.5h |
| 6.4 | Config Caddy HTTPS | 1h |
| 6.5 | Migration DB production + seed | 1h |
| 6.6 | Tests API production | 1.5h |
| 6.7 | Script backup pg_dump | 0.5h |

**Livrable** : Backend déployé

### DEV B — Frontend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 6.1 | Build production frontend | 1h |
| 6.2 | Variables env production | 0.5h |
| 6.3 | Déploiement frontend VPS | 1h |
| 6.4 | Tests E2E manuels production | 2.5h |
| 6.5 | Corrections bugs production | 2h |
| 6.6 | Documentation utilisateur | 1h |

**Livrable** : Frontend déployé, tests OK

**Sync soir** : Système complet testé

═══════════════════════════════════════════════════════════════════════════════
# JOUR 7 — HARDENING + LIVRAISON

## Objectif : Sécuriser, documenter, former, livrer

### DEV A — Backend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 7.1 | Vérifier endpoints protégés auth | 1.5h |
| 7.2 | Vérifier contraintes DB | 1h |
| 7.3 | Test charge basique | 1h |
| 7.4 | Documentation API | 1.5h |
| 7.5 | Compte admin production | 0.5h |
| 7.6 | Vérifier backup | 0.5h |
| 7.7 | Support direct bugs | 2h |

**Livrable** : Backend sécurisé, documenté

### DEV B — Frontend (8h)
| # | Tâche | Heures |
|---|-------|--------|
| 7.1 | Responsive tablette | 1h |
| 7.2 | Vérifier impressions | 1h |
| 7.3 | Guide utilisateur | 1.5h |
| 7.4 | Formation pharmacien (2h) | 2h |
| 7.5 | Corrections finales | 1.5h |
| 7.6 | Livraison accès + docs | 1h |

**Livrable** : Frontend finalisé, utilisateurs formés

**LIVRAISON FINALE**

═══════════════════════════════════════════════════════════════════════════════
# API À CRÉER (28 endpoints)

## Auth (3)
POST /api/auth/register | POST /api/auth/login | GET /api/auth/me

## Médicaments (5)
GET /api/drugs | POST /api/drugs | GET /api/drugs/:id | PUT /api/drugs/:id | DELETE /api/drugs/:id

## Lots (4)
POST /api/batches | GET /api/batches | GET /api/batches/:id | PUT /api/batches/:id/quarantine

## Stock (2)
GET /api/stock | GET /api/stock/:drugId

## Patients (6)
GET /api/patients | POST /api/patients | GET /api/patients/:id | PUT /api/patients/:id | POST /api/patients/:id/allergies | GET /api/patients/:id/allergies

## Ordonnances (5)
GET /api/prescriptions | POST /api/prescriptions | GET /api/prescriptions/:id | POST /api/prescriptions/:id/lines | PUT /api/prescriptions/:id/status

## Dispensations (3)
POST /api/dispensations | GET /api/dispensations | GET /api/dispensations/:id

## Alertes (2)
GET /api/alerts | POST /api/alerts/:id/acknowledge

## Dashboard (1)
GET /api/dashboard/stats

## Audit (1)
GET /api/audit-logs

═══════════════════════════════════════════════════════════════════════════════
# ÉCRANS À DÉVELOPPER (20 pages)

1. /login — Login
2. /dashboard — Dashboard
3. /drugs — Médicaments liste
4. /drugs/:id — Médicament détail
5. /drugs/new — Nouveau médicament
6. /stock — Stock
7. /stock/:drugId — Stock détail
8. /batches/new — Réception lot
9. /patients — Patients liste
10. /patients/:id — Patient détail
11. /patients/new — Nouveau patient
12. /prescriptions — Ordonnances liste
13. /prescriptions/:id — Ordonnance détail
14. /prescriptions/new — Nouvelle ordonnance
15. /dispensations/new — Dispensation
16. /dispensations — Historique
17. /dispensations/:id — Détail
18. /dispensations/:id/print — Reçu
19. /alerts — Alertes
20. /admin/users — Utilisateurs

═══════════════════════════════════════════════════════════════════════════════
# TESTS MINIMUMS AVANT PRODUCTION (20 tests)

🔴 Bloquants (15) : T1-T8, T10-T11, T15, T19 + T4 stock négatif, T5 FEFO, T6 périmé, T7 quarantaine
🟠 Haute (3) : T9 allergies, T12 alertes stock, T13 alertes péremption, T14 RBAC, T18 backup
🟡 Moyenne (2) : T16 impression, T17 responsive, T20 performance

Sécurité (5) : JWT fort, bcrypt, CORS, logs sans PII, Prisma anti-SQLi

═══════════════════════════════════════════════════════════════════════════════
# RISQUES TECHNIQUES

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|-------------|--------|------------|
| R1 | Schéma Prisma migration échoue | Moyenne | Critique | Tester J1 matin, simplifier si besoin |
| R2 | FEFO mal implémenté | Moyenne | Critique | Test rigoureux J4, algo simple |
| R3 | Transaction dispensation échoue | Moyenne | Critique | Prisma $transaction, test J4 |
| R4 | Déploiement VPS problématique | Élevée | Haute | Buffer 1.5h J6, fallback Railway |
| R5 | Caddy HTTPS échoue | Moyenne | Haute | Vérifier DNS avant J6, fallback nginx |
| R6 | Next.js build échoue prod | Moyenne | Haute | Tester build local J6 matin |
| R7 | Performance DB lente | Faible | Moyenne | Index déjà définis |
| R8 | Responsive cassé tablette | Moyenne | Moyenne | Test J7 matin |
| R9 | Un dev tombe malade | Faible | Critique | Partage daily, docs continues |
| R10 | Pharmacien change workflow | Moyenne | Haute | Atelier J1 soir |
| R11 | Coupure électricité déploiement | Élevée (RDC) | Haute | Déployer Samedi, UPS |
| R12 | Internet instable formation | Élevée (RDC) | Moyenne | Guide écrit, pas seulement démo |

## Plans de contingence
- Si retard J5 → Prioriser dispensation + auth + stock, reporter alertes UI avancées
- Si déploiement échoue J6 → Fallback Railway (1 clic)
- Si formation impossible J7 → Guide écrit + support téléphonique J7-J8

═══════════════════════════════════════════════════════════════════════════════
# CHECKLIST MISE EN PRODUCTION

## Infrastructure
- [ ] VPS accessible SSH
- [ ] PostgreSQL installé
- [ ] Backend démarré
- [ ] Frontend servi
- [ ] Caddy HTTPS
- [ ] Firewall 80, 443, 22
- [ ] DNS pointe VPS

## Base de données
- [ ] Migration appliquée
- [ ] Seed exécuté
- [ ] Contraintes CHECK actives
- [ ] Index créés
- [ ] Backup pg_dump testé

## Sécurité
- [ ] JWT_SECRET changé
- [ ] ENCRYPTION_KEY définie
- [ ] NODE_ENV=production
- [ ] CORS configuré
- [ ] AuditLog active

## Application
- [ ] Login OK
- [ ] CRUD médicaments OK
- [ ] Réception lot OK
- [ ] Stock cohérent
- [ ] CRUD patient OK
- [ ] Ordonnance créable
- [ ] Dispensation FEFO OK
- [ ] Alertes visibles
- [ ] Reçu imprimable
- [ ] RBAC fonctionnel

## Documentation
- [ ] Guide utilisateur 1 page
- [ ] Liste endpoints API
- [ ] Procédure backup
- [ ] Procédure restauration
- [ ] Contacts support

## Formation
- [ ] Pharmacien formé (2h)
- [ ] Technicien formé
- [ ] Compte admin créé
- [ ] Mots de passe changés
- [ ] Téléphone support noté

═══════════════════════════════════════════════════════════════════════════════
# BACKLOG POST-MVP

## Semaine 2 (J8-J14)
| # | Feature | Priorité |
|---|---------|----------|
| 1 | PWA Offline-first | 🔴 Haute |
| 2 | pg_cron alertes automatiques | 🔴 Haute |
| 3 | Refresh token + sessions | 🟠 Moyenne |
| 4 | Tests unitaires + intégration | 🟠 Moyenne |
| 5 | CI/CD GitHub Actions | 🟡 Basse |
| 6 | Import CSV médicaments | 🟠 Moyenne |
| 7 | Génération PDF reçu | 🟠 Moyenne |
| 8 | Registre stupéfiants UI | 🔴 Haute |
| 9 | Commandes fournisseurs | 🟠 Moyenne |
| 10 | AuditLog trigger DB | 🟠 Moyenne |
| 11 | Rate limiting | 🟡 Basse |
| 12 | Verrouillage compte | 🟡 Basse |
| 13 | Monitoring Sentry | 🟡 Basse |
| 14 | Multi-devises taux | 🟡 Basse |

## Semaine 3-4 (J15-J28)
| # | Feature | Priorité |
|---|---------|----------|
| 15 | Chiffrement pgcrypto VIH/TB | 🔴 Haute |
| 16 | Chaîne du froid | 🟠 Moyenne |
| 17 | Inventaire physique | 🟠 Moyenne |
| 18 | Usage interne | 🟠 Moyenne |
| 19 | Assurances UI complète | 🟡 Basse |
| 20 | Transferts inter-services | 🟡 Basse |
| 21 | DrugSubstitute/Interaction | 🟡 Basse |
| 22 | Fuzzy search | 🟡 Basse |
| 23 | Double signature stupéfiants | 🔴 Haute |
| 24 | Sessions multiples | 🟡 Basse |
| 25 | Rapports avancés Excel | 🟠 Moyenne |
| 26 | Backup automatisé B2 | 🟠 Moyenne |

## V3+ (3+ mois)
| # | Feature | Priorité |
|---|---------|----------|
| 27 | Multi-sites Kintambo+Bumbu | 🔴 Haute |
| 28 | Application mobile | 🟠 Moyenne |
| 29 | Intégration SIH/FHIR | 🟡 Basse |
| 30 | Analytics avancés | 🟡 Basse |
| 31 | WebSockets temps réel | 🟡 Basse |
| 32 | Redis cache/sessions | 🟡 Basse |

═══════════════════════════════════════════════════════════════════════════════
# RÉCAPITULATIF

| Jour | Dev A | Dev B | Total | Objectif |
|------|-------|-------|-------|----------|
| J1 | 8h | 8h | 16h | Auth + structure |
| J2 | 8h | 8h | 16h | Médicaments + stock |
| J3 | 8h | 8h | 16h | Patients + ordonnances |
| J4 | 8h | 8h | 16h | Dispensation (cœur) |
| J5 | 8h | 8h | 16h | Alertes + polish |
| J6 | 8h | 8h | 16h | Déploiement + tests |
| J7 | 8h | 8h | 16h | Hardening + livraison |
| **Total** | **56h** | **56h** | **112h** | **MVP livré** |

## Répartition charge
- Dev A : ~45h backend + ~5h frontend + ~6h ops = 56h
- Dev B : ~5h backend + ~45h frontend + ~6h ops = 56h

## Conseils pour réussir
1. Ne pas perfectionner — si ça marche, c'est bon
2. Communiquer toutes les 2h — problème = partagé immédiatement
3. Pas de discussion architecture — décisions prises, on code
4. Seed riche dès J1 — données test réalistes accélèrent tout
5. Tester parcours critique chaque soir
6. Dormir — fatigue tue productivité J4-5
7. Fallback Railway — si VPS pose problème, déploiement 5 min
8. Guide écrit > démo orale — en RDC, internet coupe, PDF reste

═══════════════════════════════════════════════════════════════════════════════
