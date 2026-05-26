Voici le document d'architecture technique mis à jour selon vos spécifications, enregistré au format Markdown.

```markdown
# SHOPMANAGER PRO – ARCHITECTURE TECHNIQUE COMPLÈTE (VERSION 2.0)

**Version 2.0** – Système de Gestion Commerciale Universel (Web)  
**Décembre 2025** – 70 pages

---

## SOMMAIRE DÉTAILLÉ

1. Introduction et vue d’ensemble (3 pages)
2. Principes architecturaux fondamentaux (4 pages)
3. Architecture en couches (3 pages)
4. Structure des projets (backend + frontend) (7 pages)
5. Acteurs du système et cas d’utilisation (5 pages)
6. Modules backend – spécifications détaillées (12 pages)
7. Architecture base de données – modèles complets (9 pages)
8. Relations entre collections – schémas et intégrité référentielle (2 pages)
9. Cycle de vie d’une vente – pipeline transactionnelle (5 pages)
10. Architecture temps réel (Socket.IO) (3 pages)
11. Architecture des notifications (WhatsApp, email, in-app) (4 pages)
12. Architecture de génération de documents (PDF, rapports) (3 pages)
13. Architecture du système de fidélité et suivi clients (3 pages)
14. Architecture des alertes stock et péremption (3 pages)
15. Architecture des portefeuilles (wallets) et transactions (4 pages)
16. Architecture de l’assistant IA (chatbot intelligent) (3 pages)
17. Architecture import/export des données (3 pages)
18. Architecture de sécurité (RBAC, JWT, audits, backups) (5 pages)
19. API Design – conventions et endpoints complets (7 pages)
20. Cron jobs & tâches planifiées (2 pages)
21. Cache & performance (Redis, indexation) (3 pages)
22. Architecture déploiement (MVP → Production) (3 pages)
23. Diagrammes de séquence détaillés (4 pages)
24. Stratégie de scalabilité et montée en charge (2 pages)
25. Annexes : exemples de code, configuration, variables d’environnement (3 pages)

**Total estimé : 70 pages**

---

## 1. Introduction et vue d’ensemble

### 1.1 Contexte
ShopManager Pro est une solution SaaS de gestion commerciale universelle destinée aux commerces de détail. Elle remplace les processus manuels par une plateforme web centralisée, temps réel et intelligente.

### 1.2 Philosophie
- **Universalité** : paramétrable pour tout type de commerce.
- **Automatisation** : chaque vente déclenche stock, facture, portefeuille, dettes, logs.
- **Intelligence contextuelle** : assistant IA, alertes proactives.
- **Multi-portefeuilles** : espèces, banque, CCP, Mobile Money.
- **Gestion complète des dettes** : clients et fournisseurs.
- **Licence perpétuelle** : paiement unique, cloud ou on‑premise.
- **Internationalisation** : interface bilingue (français/arabe) avec commutateur.

### 1.3 Objectifs mesurables
- Digitalisation à 100 % des opérations.
- Temps de traitement d’une vente < 30 secondes.
- Alertes en temps réel.
- Assistant IA répondant en langage naturel (français/arabe) à 95 % des questions.
- Support multi‑magasins.

### 1.4 Schéma global
```

[Terminal caisse] --(HTTP)--> [API Gateway (Express)] --(Mongoose)--> [MongoDB Atlas]
│                            │
└── (scan code-barres)       └── [Service PDF] ── [WhatsApp/Email API]
└── [Socket.IO] ── [Dashboard Admin]
└── [BullMQ] ── [Tâches asynchrones]
└── [Assistant IA] ── [LLM API]

```

---

## 2. Principes architecturaux fondamentaux

| Principe | Décision technique | Justification |
|----------|--------------------|----------------|
| Monolithe modulaire | Backend Node.js unique, modules internes | Livraison rapide, cohérence transactionnelle |
| API-First | Toutes fonctionnalités exposées via REST | Frontend web, future app mobile |
| Temps réel sélectif | Socket.IO : alertes, dashboard | Réactivité sans overhead |
| Stateless backend | JWT + refresh token | Scalabilité horizontale |
| RBAC | Middleware : employé, admin, comptable | Sécurité, moindre privilège |
| Traçabilité immuable | Collection logs en append-only | Audit complet |
| Asynchrone critique | BullMQ (Redis) pour PDF, WhatsApp, IA | Ne bloque pas le flux principal |
| Stock unifié | Collection `stock` avec prix moyen pondéré | Simplicité, performances |
| Multi-portefeuilles | `Wallet` + `WalletTransaction` | Gestion des flux financiers |
| Dettes intégrées | `customer.debt` + `supplier.debt` | Vision temps réel des encours |
| Internationalisation | i18n (français/arabe) + commutateur UI | Accessibilité universelle |

---

## 3. Architecture en couches

```
┌─────────────────────────────────────────────────────────────┐
│                      COUCHE CLIENT                          │
│  - Interface Web (React + Vite + Tailwind)                  │
│  - Scanner USB / Caméra (code-barres)                       │
│  - Commutateur de langue (Français/Arabe)                   │
└─────────────────────────────────────────────────────────────┘
│ HTTPS / WebSocket
┌─────────────────────────────────────────────────────────────┐
│                   COUCHE PRÉSENTATION (API)                 │
│  - Middlewares : auth, rbac, validation, rate limit         │
│  - Controllers : mapping HTTP → services                    │
└─────────────────────────────────────────────────────────────┘
│
┌─────────────────────────────────────────────────────────────┐
│                    COUCHE MÉTIER (SERVICES)                 │
│  - SalesService, StockService, WalletService, DebtService   │
│  - LoyaltyService, InvoiceService, ReportService            │
│  - AlertService, AIService, ImportExportService             │
└─────────────────────────────────────────────────────────────┘
│
┌─────────────────────────────────────────────────────────────┐
│                   COUCHE ACCÈS DONNÉES                      │
│  - Modèles Mongoose                                         │
│  - Agrégations MongoDB                                      │
│  - Indexation optimisée                                     │
└─────────────────────────────────────────────────────────────┘
│
┌─────────────────────────────────────────────────────────────┐
│                    SERVICES EXTERNES                        │
│  - WhatsApp Business API, Email (Nodemailer/SendGrid)       │
│  - Puppeteer (PDF), LLM API (OpenAI/Mistral/local)          │
│  - Redis (cache + BullMQ)                                   │
└─────────────────────────────────────────────────────────────┘

```

---

## 4. Structure des projets (backend + frontend)

### 4.1 Backend – structure modulaire (Node.js / Express)

```

shopmanager-backend/
├── src/
│   ├── modules/
│   │   ├── auth/ (auth.routes.js, auth.controller.js, auth.service.js, strategies/jwt.strategy.js)
│   │   ├── employees/ (employee.routes.js, employee.controller.js, employee.service.js, employee.model.js)
│   │   ├── stores/ (store.routes.js, store.controller.js, store.service.js, store.model.js)
│   │   ├── products/ (product.routes.js, product.controller.js, product.service.js, product.model.js)
│   │   ├── stock/ (stock.routes.js, stock.controller.js, stock.service.js, stock.model.js)
│   │   ├── sales/ (sale.routes.js, sale.controller.js, sale.service.js, sale.model.js)
│   │   ├── customers/ (customer.routes.js, customer.controller.js, customer.service.js, customer.model.js, debt.service.js)
│   │   ├── suppliers/ (supplier.routes.js, supplier.controller.js, supplier.service.js, supplier.model.js, supplierDebt.service.js)
│   │   ├── wallets/ (wallet.routes.js, wallet.controller.js, wallet.service.js, wallet.model.js, transaction.model.js)
│   │   ├── invoices/ (invoice.routes.js, invoice.controller.js, invoice.service.js, invoice.model.js)
│   │   ├── dashboard/ (dashboard.routes.js, dashboard.controller.js, dashboard.service.js)
│   │   ├── reports/ (report.routes.js, report.controller.js, report.service.js, templates/)
│   │   ├── ai/ (ai.routes.js, ai.controller.js, ai.service.js, intent.mapper.js)
│   │   ├── importExport/ (importExport.routes.js, importExport.controller.js, import.service.js, export.service.js, validation/)
│   │   ├── admin/ (admin.routes.js, admin.controller.js, admin.service.js)
│   │   └── notifications/ (notification.routes.js, notification.controller.js, notification.service.js, notification.model.js)
│   ├── services/ (pdf.service.js, whatsapp.service.js, email.service.js, loyalty.service.js, alert.service.js, log.service.js, queue.service.js, llm.service.js)
│   ├── socket/ (socket.server.js, alert.socket.js, dashboard.socket.js, ai.socket.js)
│   ├── jobs/ (dailyReport.job.js, weeklySummary.job.js, debtReminder.job.js, backup.job.js, syncRetry.job.js)
│   ├── middlewares/ (auth.middleware.js, rbac.middleware.js, audit.middleware.js, rateLimit.middleware.js, validate.middleware.js, error.middleware.js)
│   ├── utils/ (apiResponse.js, invoiceNumber.js, encryption.js, fifo.util.js, date.util.js)
│   ├── config/ (database.js, redis.js, whatsapp.js, llm.js)
│   └── app.js
├── server.js
├── package.json
├── .env.example
└── docker-compose.yml

```

### 4.2 Frontend – React + Vite (JavaScript)

```

shopmanager-frontend/
├── src/
│   ├── pages/
│   │   ├── employee/ (Dashboard.jsx, POS.jsx, Search.jsx, Customers.jsx, CustomerDetail.jsx, Invoices.jsx, Stock.jsx)
│   │   ├── admin/ (Dashboard.jsx, StockManagement.jsx, StockReceipt.jsx, Employees.jsx, Wallets.jsx, Debts.jsx, Reports.jsx, Analytics.jsx, Logs.jsx, ImportExport.jsx, AIConsole.jsx, MultiStore.jsx, Settings.jsx)
│   │   ├── auth/ (Login.jsx, Logout.jsx)
│   │   └── Layout.jsx
│   ├── components/
│   │   ├── ui/ (Button, Card, Modal, Toast, LanguageSwitcher.jsx)
│   │   ├── pos/ (BarcodeScanner, ProductCard, Cart, Payment)
│   │   ├── stock/ (StockIndicator, AlertBadge)
│   │   ├── customers/ (LoyaltyPoints, DebtBadge, HistoryTable)
│   │   ├── wallets/ (WalletBalance, TransferForm)
│   │   ├── reports/ (Chart, ExportButton)
│   │   └── ai/ (ChatWindow, MessageBubble)
│   ├── hooks/ (useAuth.js, useSocket.js, useNotifications.js, useBarcodeDetection.js, useAIChat.js, useLanguage.js)
│   ├── services/ (api.js, socket.js, authService.js)
│   ├── stores/ (cartStore.js, authStore.js, notificationStore.js, languageStore.js)
│   ├── locales/ (fr.json, ar.json)
│   └── lib/ (indexedDB.js, i18n.js)
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js

```

---

## 5. Acteurs du système et cas d’utilisation

### 5.1 Tableau des acteurs

| Acteur | Rôle principal | Droits | Interactions typiques |
|--------|----------------|--------|------------------------|
| Employé (caissier) | Opérateur caisse, gestion clients, consultation stock | Lecture stock, écriture ventes, création clients | POS, recherche, fiche client |
| Administrateur | Gestion complète, paramétrage, supervision | CRUD produits, gestion entrées stock, gestion employés, rapports, logs, portefeuilles, dettes | Dashboard, entrées stock, rapports |
| Comptable | Rapports, consultation portefeuilles (lecture seule) | Lecture portefeuilles, rapports, logs | Consultation financière, validation |

### 5.2 Principaux cas d’utilisation
- **UC1 – Effectuer une vente** (Employé)
- **UC2 – Gérer les entrées de stock** (Admin)
- **UC3 – Gérer les dettes clients** (Admin/Employé)
- **UC4 – Consulter les alertes** (Admin/Employé)
- **UC5 – Gérer programme de fidélité** (Admin/Employé)
- **UC6 – Gérer les portefeuilles** (Admin)
- **UC7 – Consulter les rapports** (Admin/Comptable)
- **UC8 – Interagir avec l’assistant IA** (Admin/Employé)
- **UC9 – Importer/Exporter des données** (Admin)
- **UC10 – Changer de langue** (tous les acteurs)

---

## 6. Modules backend – spécifications détaillées

### 6.1 Module Auth
- **Responsabilités** : authentification par téléphone, JWT, refresh token.
- **Endpoints** :
  - `POST /api/auth/login` → `{ phone, password, storeId }` → `{ accessToken, user, store }`
  - `POST /api/auth/refresh` → `{ refreshToken }` → nouveau accessToken
  - `POST /api/auth/logout`
  - `GET /api/auth/me` → utilisateur courant + permissions
- **Sécurité** : bcrypt (salt 12), rate limiting 5 tentatives/15min, logs.

### 6.2 Module Sales (cœur)
- **Responsabilités** : panier, validation, pipeline transactionnelle.
- **Processus** :
  1. Réception payload (items, customerId, paymentMethod, walletId, cashGiven, useLoyaltyPoints)
  2. Validation stock (via `stock` collection)
  3. Calcul total, TVA, points
  4. Transaction MongoDB
  5. Création sale (avec items intégrés)
  6. Mise à jour stock (décrémentation)
  7. Mise à jour dette client ou portefeuille
  8. Mise à jour points fidélité
  9. Génération PDF + envois asynchrones (BullMQ)
  10. Commit, émission Socket.IO, vérification alertes
  11. Retour `{ saleId, invoiceNumber, changeAmount, loyaltyPointsEarned }`

> *L'annulation d'une vente ne supprime pas la `sale` ni la `invoice`. On marque uniquement `invoice.status = 'cancelled'` et `invoice.cancelledAt = now()`.*

### 6.3 Module Stock
- **Responsabilités** : gestion unifiée des stocks (quantité, prix moyen).
- **Fonctions** :
  - `receiveStock(input)` : ajoute quantité, met à jour prix moyen, incrémente dette fournisseur.
  - `sellStock(productId, quantity)` : décrémente quantité.
  - `adjustStock(productId, quantity, reason)` : correction manuelle.
- **Endpoints (admin)** :
  - `POST /api/stock/receive`
  - `POST /api/stock/adjust`
  - `POST /api/stock/transfer`

### 6.4 Module Wallets & Transactions
- **Types** : cash, bank, ccp, mobile_money, customer_deposit.
- **Fonctions** : create, credit, debit, transfer, getBalance, reconcile.

### 6.5 Module Debts (Clients + Fournisseurs)
- **Règles** : vente à crédit → incrémente `customer.debt` ; réception stock → incrémente `supplier.debt` ; paiements → décrémentent.
- **Relances automatiques** si dette > 30 jours.

### 6.6 Module AI Assistant
- **Stack** : LLM (OpenAI/Mistral/Llama), function calling, agrégations MongoDB.
- **Exemples** : "Quel est le CA de cette semaine ?", "Clients qui doivent plus de 5000 MRU".
- **Endpoints** : `POST /api/ai/chat`, `GET /api/ai/suggestions`.

### 6.7 Module Import/Export
- **Formats** : Excel (.xlsx), CSV (UTF-8), JSON.
- **Processus** : upload → validation → détection doublons → import transactionnel → rapport.
- **Exports automatiques** : quotidien, hebdomadaire, backup JSON.

### 6.8 Module Dashboard & Reports
- **KPIs** : CA, top produits, marge, encours clients, soldes portefeuilles.
- **Exports** : PDF (Puppeteer), Excel (exceljs).

---

## 7. Architecture base de données – modèles complets (Mongoose)

### 7.1 Collection `users`
```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  name: String,
  phone: String, unique,
  passwordHash: String,
  role: ['admin', 'employee', 'accountant'],
  isActive: Boolean,
  permissions: [String],
  lastLogin: Date,
  createdAt: Date,
  refreshTokenHash: String
}
```

7.2 Collection stores

```javascript
{
  _id: ObjectId,
  name: String,
  logo: String,
  address: String,
  phone: String,
  email: String,
  taxId: String,
  currency: String,
  settings: {
    loyaltyPointsPer100: Number,
    loyaltyRedeemRate: Number,
    invoiceNextNumber: Number,
    vatRate: Number,
    lowStockThresholdPercent: Number
  },
  isActive: Boolean,
  createdAt: Date
}
```

> *Note : Tous les paramètres du magasin (vatRate, loyaltyPointsPer100, etc.) sont stockés exclusivement dans l'objet `settings` de la collection `stores`. Aucune collection `settings` séparée n'existe.*

7.3 Collection products

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  name: String,
  dci: String,
  barcode: String, unique sparse,
  category: String,
  sellPrice: Number,
  purchasePrice: Number,   // prix moyen pondéré
  minStock: Number,
  unit: String,
  requiresPrescription: Boolean,
  isActive: Boolean,
  imageUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

7.4 Collection stock (remplace stock_batches et stock_movements)

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  productId: ObjectId,
  quantity: Number,
  lotNumber: String,         // optionnel, pour traçabilité
  purchasePrice: Number,     // prix d'achat de ce lot spécifique
  receptionDate: Date,
  supplierId: ObjectId,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Index : { productId: 1, receptionDate: 1 }
```

Note : La gestion FIFO se fait en sélectionnant les documents stock triés par receptionDate. Les mouvements ne sont pas stockés séparément ; on calcule la quantité totale par agrégation.

7.5 Collection sales (avec items intégrés – suppression de sale_items)

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  cashierId: ObjectId,       // référence vers users
  customerId: ObjectId,
  totalAmount: Number,
  discount: Number,
  vatAmount: Number,         // montant TVA calculé
  vatRate: Number,           // taux TVA appliqué au moment de la vente
  paymentMethod: ['cash', 'card', 'credit', 'mixed'],
  walletId: ObjectId,        // optionnel (required: false)
  paymentBreakdown: {        // optionnel, pour paiements mixtes
    cash: Number,
    card: Number,
    credit: Number
  },
  isCredit: Boolean,
  debtAmount: Number,
  status: 'completed' | 'cancelled',
  saleDate: Date,
  notes: String,
  items: [                   // tableau d'articles vendus
    {
      productId: ObjectId,
      stockId: ObjectId,     // référence vers le stock (lot) consommé
      quantity: Number,
      unitPrice: Number,
      purchasePrice: Number, // prix d'achat au moment de la vente
      subtotal: Number,
      profit: Number
    }
  ]
}
```

> *Note : En cas de paiement mixte, seul le montant payé en espèces/carte est enregistré dans `wallet_transactions`. Le montant crédité augmente uniquement `customer.currentDebt` sans mouvement de wallet.*

7.6 Collection customers

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  name: String,
  phone: String, unique per store,
  email: String,
  address: String,
  creditLimit: Number,
  currentDebt: Number,
  loyaltyPoints: Number,
  birthDate: Date,
  allergies: String,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

7.7 Collection suppliers

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  name: String,
  phone: String,
  email: String,
  address: String,
  currentDebt: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

7.8 Collection wallets

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  name: String,
  type: 'cash' | 'bank' | 'ccp' | 'mobile_money' | 'customer_deposit',
  currency: String,
  balance: Number,
  minBalance: Number,
  isActive: Boolean,
  lastReconciliation: Date,
  createdAt: Date,
  updatedAt: Date
}
```

7.9 Collection wallet_transactions (immuable)

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  walletId: ObjectId,
  type: 'credit' | 'debit' | 'transfer',
  amount: Number,
  balanceAfter: Number,
  reference: String,
  description: String,
  userId: ObjectId,
  timestamp: Date
}
```

7.10 Collection invoices

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  saleId: ObjectId, unique,
  invoiceNumber: String,
  pdfUrl: String,
  sentViaWhatsApp: Boolean,
  sentViaEmail: Boolean,
  sentAt: Date,
  whatsappMessageId: String,
  emailMessageId: String,
  error: String,
  status: { type: String, enum: ['issued', 'cancelled'], default: 'issued' },
  cancelledAt: Date,
  whatsappRetryCount: Number
}
```

> *Règle : En cas d'annulation, le numéro de facture n'est jamais réutilisé. Le compteur `invoiceNextNumber` n'est pas décrémenté.*

7.11 Collection notifications

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  type: 'stock_critical' | 'out_of_stock' | 'debt_overdue' | 'low_wallet' | 'whatsapp_failed',
  message: String,
  targetRole: ['admin', 'employee', 'accountant'],
  targetUserId: ObjectId,
  isRead: Boolean,
  relatedEntity: { productId, stockId, customerId, supplierId, walletId },
  createdAt: Date
}
```

7.12 Collection logs (immuable, append-only)

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  userId: ObjectId,
  action: 'sale' | 'stock_receipt' | 'stock_adjust' | 'payment' | 'login' | 'logout' | 'import' | 'settings_change',
  entity: 'Sale' | 'Product' | 'Customer' | 'Supplier' | 'Wallet',
  entityId: ObjectId,
  details: Object,
  ip: String,
  userAgent: String,
  timestamp: Date
}
```



7.13 Collection employees (gestion des employés – distincte de users pour plus de flexibilité)

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,
  userId: ObjectId,            // optionnel — uniquement pour les employés ayant accès au système
  employeeNumber: String,      // matricule unique
  position: String,            // 'caissier', 'superviseur', 'gérant'
  hireDate: Date,
  salary: Number,
  commissionRate: Number,
  emergencyContact: {
    name: String,
    phone: String
  },
  documents: [{
    name: String,
    url: String
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

> *Note : Certains employés (ex: livreurs) sont enregistrés à des fins RH uniquement, sans compte de connexion au système.*

---

8. Relations entre collections – intégrité référentielle

```
stores
  │
  ├───< has >─── users
  ├───< has >─── employees
  ├───< has >─── products
  ├───< has >─── customers
  ├───< has >─── suppliers
  ├───< has >─── wallets
  ├───< has >─── sales
  └───< has >─── stock

products ───< appears in >─── stock (1..N)
stock ───< consumed by >─── sales.items
sales ───< generates >─── invoices (1..1)
sales ───< linked to >─── customer (0..1)
sales ───< credited to >─── wallet (0..1)
customers ───< has many >─── sales
suppliers ───< provides >─── stock
wallets ───< has many >─── wallet_transactions
users ───< is linked to >─── employees (0..1)
```

Contraintes : Transactions ACID pour opérations critiques (vente, réception). Validations mongoose ref.

---

9. Cycle de vie d’une vente – pipeline transactionnelle

9.1 Déroulement complet

1. Requête HTTP POST /api/sales
2. Contrôleur → validation Zod → salesService.createSale()
3. Service :
   · Démarre session MongoDB
   · Pour chaque item : vérifie stock disponible (agrégation sur stock)
   · Sélectionne les lots FIFO (tri par receptionDate)
   · Calcule total, TVA, points
4. Si paiement crédit : vérifie customer.creditLimit et currentDebt
5. Création documents (transaction) :
   · Sale avec items (contenant stockId, purchasePrice)
   · Décrémentation des lignes stock ($inc)
   · Mise à jour customer.currentDebt ou wallet.balance
   · Mise à jour points fidélité
6. Génération facture asynchrone (BullMQ) : PDF, envoi WhatsApp/Email
7. Post-vente : émission Socket.IO, alertes, logs
8. Réponse JSON avec saleId, invoiceNumber, etc.

9.2 Gestion FIFO concurrente (atomique)

```javascript
const updated = await Stock.findOneAndUpdate(
  { _id: item._id, quantity: { $gte: needed } },
  { $inc: { quantity: -needed } },
  { session, new: true }
);
if (!updated) throw new Error(`Stock insuffisant pour lot ${item._id}`);
```

---

10. Architecture temps réel (Socket.IO)

10.1 Rooms

· store:{storeId} : toutes les notifications du magasin
· admin:{storeId} : alertes critiques + dashboard
· employee:{userId} : notifications personnelles
· ai:{userId} : réponses assistant IA

10.2 Événements

· alert:stock_critical, alert:out_of_stock, alert:debt_overdue
· dashboard:update, sale:new, ai:response

10.3 Authentification WebSocket

· Connexion avec ws://...?token=JWT&storeId=...
· Middleware vérifie token et joint automatiquement les rooms

---

11. Architecture des notifications

Événement In-app Socket.IO WhatsApp Email admin
Vente validée (client) ❌ ❌ ✅ (facture) ❌
Vente à crédit ✅ ✅ ❌ ❌
Stock critique ✅ ✅ ❌ ✅ (résumé)
Dette client > 30j ✅ ✅ ✅ (client) ✅

Anti-spam : max 1 alerte/heure pour stock, max 3 relances dette, max 2 emails/jour admin.

### 11.4 Politique de reprise WhatsApp

· BullMQ avec `attempts: 5`, backoff exponentiel : 2s, 4s, 8s, 16s, 32s.
· En cas d'échec final : mise à jour du champ `error` dans `invoices` + création d'une notification `whatsapp_failed` à destination de l'admin.

---

12. Architecture de génération de documents

· Facture PDF : Puppeteer + template EJS, sauvegarde locale ou S3, envoi asynchrone.
· Rapports Excel : exceljs, agrégations MongoDB → buffer → téléchargement.
· Optimisations : cache template, timeout 10s, worker BullMQ dédié.

---

13. Architecture du système de fidélité

· Modèle : loyalty_points_per_100 (ex: 1 point par 100 unités), loyalty_redeem_rate (1 point = 1 unité de remise)
· Historique (V2) : collection loyalty_transactions (earn/redeem)
· Rappels automatiques (V2) : cron hebdo pour traitements chroniques
· Dashboard admin : top clients points, CA généré, taux de remise

---

14. Architecture des alertes stock

14.1 Vérification post-opération

```javascript
async function checkProductAlerts(productId) {
  const totalStock = await Stock.aggregate([...]); // somme quantités
  if (totalStock === 0) => alert out_of_stock
  else if (totalStock <= product.minStock) => alert stock_critical
}
```

14.2 Interface employé

· 🟢 Vert : stock > minStock
· 🟠 Orange : stock ≤ minStock
· 🔴 Rouge : rupture

---

15. Architecture des portefeuilles et transactions

· Principe : chaque réserve de valeur est un Wallet.
· Transaction : création WalletTransaction + mise à jour wallet.balance ($inc) dans transaction ACID.
· Transfert entre portefeuilles : débit source, crédit destination, logs.
· Alerte trésorerie si balance <= minBalance.

> *Règle impérative : Chaque modification de solde d'un wallet (crédit, débit, transfert) DOIT créer une nouvelle entrée dans `wallet_transactions` dans la même transaction ACID. Aucune mise à jour directe de `wallet.balance` sans écriture correspondante dans `wallet_transactions` n'est autorisée.*

---

16. Architecture de l’assistant IA

Stack : LLM (GPT-4o / Mistral / Llama), function calling, agrégations MongoDB.

Flux :

```
[User Message] → [LLM API] → [Intent Classification] → [Tool Selection]
                                                           ↓
                                            [MongoDB Query Generator]
                                                           ↓
                                            [Execute Aggregation]
                                                           ↓
                                            [Response Formatter]
                                                           ↓
                                    [Text + Chart + Report]
```

Sécurité : isolation par storeId, RBAC (employé ne peut pas poser de questions financières sensibles), logs optionnels.

**Sécurité et RBAC :**

· Le rôle de l'utilisateur (`req.user.role`) est injecté dans le `systemPrompt` envoyé au LLM.
· Les fonctions (tools) disponibles sont filtrées selon le rôle : les employés n'ont pas accès aux métriques financières (CA, bénéfices, soldes wallets, prix d'achat).
· L'API `/api/ai/chat` applique le middleware RBAC standard avant tout appel au LLM.

---

17. Architecture import/export des données

Importables : produits, clients, fournisseurs, stock initial.

Processus import : upload → validation (Zod) → détection doublons (skip/update/error) → import transactionnel → rapport d’erreurs → journalisation.

Exports automatiques (cron) :

· 0 20 * * * : rapport caisse journalier (PDF → email admin)
· 0 7 * * 1 : rapport stock hebdomadaire (Excel)
· 0 3 * * * : backup JSON complet

Endpoints manuels : /api/export/products?format=csv, etc.

---

18. Architecture de sécurité

18.1 RBAC (middleware)

```javascript
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Accès non autorisé" });
  next();
};
```

18.2 Routes protégées

· Employé : /sales/*, /customers/*, /products (GET), /stock (GET), /invoices/*
· Admin : tout sauf /auth/* public
· Comptable : /reports/*, /wallets (GET), /dashboard/financial, /logs (GET)

18.3 Logs immuables

· Insert only, pas de DELETE ni UPDATE.
· TTL pour purge après 2 ans.

18.4 Backups

· Quotidiens à 3h : mongodump → compression → envoi S3.
· Rétention 30 jours.

18.5 Rate limiting

· /api/auth/login : 5 req / 15 min par IP
· /api/sales : 30 req / min par utilisateur
· /api/reports/* : 10 req / min
· /api/ai/chat : 20 req / min
· Générique : 100 req / min par IP

---

19. API Design – conventions et endpoints complets

Base URL : https://api.shopmanager.com/v1

Format réponse :

```json
{ "success": true, "data": {}, "error": null, "meta": { "page": 1, "limit": 20, "total": 150 } }
```

Pagination : ?page=1&limit=20

Endpoints principaux

Module Méthode Endpoint Rôle
Auth POST /auth/login public
Auth POST /auth/refresh public
Auth GET /auth/me authenticated
Sales POST /sales employee
Sales GET /sales/me/daily employee
Products GET /products/search?q= both
Products POST /products admin
Stock POST /stock/receive admin
Customers POST /customers employee
Customers GET /customers/search?phone= employee
Customers POST /customers/:id/debt/pay employee
Wallets GET /wallets admin/comptable
Wallets POST /wallets/transfer admin
AI POST /ai/chat both
AI GET /ai/suggestions both
Dashboard GET /dashboard/admin admin
Reports GET /reports/daily-cash admin/comptable
Admin GET /admin/employees admin
Admin POST /admin/employees admin

---

20. Cron jobs & tâches planifiées

Job Schedule Description
dailyReportEmail 0 20 * * * Résumé stock critique + dette à l'admin
weeklySummary 0 8 * * 1 Rapport hebdo (CA, top produits, alertes)
debtReminder 0 9 * * * Relances clients dettes > 30j
backupDatabase 0 3 * * * Backup MongoDB vers S3
cleanupInactiveTokens 0 2 * * 0 Supprime refresh tokens expirés
generateInventoryReport 0 5 * * 1 Rapport stock valorisé
syncRetry 0 */6 * * * Relance les envois échoués (WhatsApp, email) en attente dans la queue BullMQ

---

21. Cache & performance (Redis)

Stratégie de cache :

Clé TTL Contenu Invalidation
product:{barcode} 24h Objet produit Mise à jour produit
dashboard:admin:daily:{storeId} 5 min CA, nb ventes, top produits Après chaque vente
stock:alert:count:{storeId} 1 min Nombre d’alertes actives Après création/résolution
customer:{phone}:{storeId} 1h Fiche client Mise à jour client

Indexation MongoDB :

· products : index text (name, dci, barcode)
· sales : index sur saleDate, cashierId, storeId
· logs : index sur timestamp (desc), storeId
· stock : index composé { productId: 1, receptionDate: 1 }

---

22. Architecture déploiement (MVP → Production)

MVP (phase initiale)

· Frontend : Vercel / Netlify
· Backend : Node.js sur Render / Railway (1 instance)
· Base de données : MongoDB Atlas M0 (free)
· Cache : Redis Upstash (free)
· Stockage PDF : disque local
· WhatsApp : API Business Meta

Production

· Backend : 2 instances + Nginx LB (VPS)
· MongoDB : M10 (dedicated)
· Redis : cluster (Upstash pro)
· Stockage PDF : AWS S3
· Queue : BullMQ avec workers dédiés

Variables d’environnement clés

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=...
REDIS_URL=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
PDF_STORAGE=local|s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=shopmanager-invoices
LLM_API_KEY=...
LLM_MODEL=gpt-4o-mini
```

---

23. Diagrammes de séquence détaillés

23.1 Vente avec client fidélité et WhatsApp

```
Employé → Frontend → API Backend → MongoDB → WhatsApp API
(scan)   (POST /sales) (début transaction, vérif stock, sélection lots, décrément stock, création sale+items, commit)
         (async queue PDF, génération PDF, upload, envoi doc)
         ←200 (saleId, PDF) → affichage
         (emit Socket.IO → admin)
```

23.2 Alerte stock critique

```
Vente terminée → AlertService → MongoDB → Socket.IO → Admin (front)
                 (find product, qty ≤ minStock, créer notification, emit alert)
                 (optionnel email admin)
```

23.3 Réception de stock (admin)

```
Admin (UI) → Frontend → API Backend → MongoDB
(saisie qty, prix, péremption) (POST /stock/receive) (début transaction, création document stock, incrément stock, maj dette fournisseur, commit, log)
                 ←200 → mise à jour UI
```

---

24. Stratégie de scalabilité et montée en charge

Niveau Utilisateurs actifs Architecture
MVP < 500 Monolithe Node.js, MongoDB M0, Redis Upstash, 1 instance
V1 500 – 2 000 2 instances API + LB, MongoDB M10, Redis persisté, BullMQ workers
V2 > 2 000 Microservices (Sales, Stock, Reports), Sharding MongoDB, CDN PDF

Goulots identifiés : génération PDF → BullMQ dès V1 ; recherche full‑text → Atlas Search ; agrégations dashboard → pré-calcul par cron.

---

25. Annexes

25.1 Exemple de configuration Docker (backend)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

25.2 Schéma de validation Zod (vente)

```javascript
const SaleItemSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  quantity: z.number().int().positive()
});
const CreateSaleSchema = z.object({
  items: z.array(SaleItemSchema).nonempty(),
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  paymentMethod: z.enum(['cash', 'card', 'credit', 'mixed']),
  walletId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  cashGiven: z.number().positive().optional(),
  useLoyaltyPoints: z.number().int().min(0).optional()
});
```

25.3 Script de backup manuel

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --gzip --archive="/backups/shopmanager_$DATE.gz"
aws s3 cp /backups/shopmanager_$DATE.gz s3://shopmanager-backups/
```

25.4 Exemple du StockService (FIFO)

```javascript
class StockService {
  async sellFromStock(productId, quantity, session) {
    const stockItems = await Stock.find({
      productId,
      quantity: { $gt: 0 }
    }).sort({ receptionDate: 1 }).session(session);
    
    let remaining = quantity;
    const usedItems = [];
    for (const item of stockItems) {
      const needed = Math.min(item.quantity, remaining);
      const updated = await Stock.findOneAndUpdate(
        { _id: item._id, quantity: { $gte: needed } },
        { $inc: { quantity: -needed } },
        { session, new: true }
      );
      if (!updated) continue;
      usedItems.push({ stockId: item._id, quantity: needed, purchasePrice: item.purchasePrice });
      remaining -= needed;
      if (remaining === 0) break;
    }
    if (remaining > 0) throw new Error('Stock insuffisant');
    return usedItems;
  }
}
```

---