# Phase 3 - Backend Sales Pipeline Tasks

Based on `docs/backend-plan.md` v2.0 §7 Phase 3, `docs/architecture.md` v2.0 §6.2/§7.5/§9, and `docs/API-contract.md` v2.0 §6.

---

## 1. New Dependencies & Infrastructure Setup

- `[ ]` **Install new npm packages**:
  - `socket.io` – realtime event broadcasting
  - `bullmq` + `ioredis` – async job queue (invoice generation)
  - `uuid` – idempotency key generation helper

- `[ ]` **Create `src/socket/` directory**:
  - `socket.server.js` – Socket.IO server initialization, JWT auth middleware, room joining (`store:{storeId}`, `admin:{storeId}`, `employee:{userId}`)
  - Export an `initSocket(server)` function that returns the io instance

- `[ ]` **Create `src/jobs/` directory**:
  - `queue.service.js` – BullMQ connection setup (Redis), export `invoiceQueue` and a `createJob` helper
  - `invoice.job.js` – worker that consumes `invoiceQueue` (stub for Phase 6 – logs the job for now)

- `[ ]` **Update `server.js`**:
  - Integrate `socket.server.js` init with the HTTP server
  - Connect to Redis for BullMQ

- `[ ]` **Update `src/app.js`**:
  - Mount new route modules: `sales`, `customers`, `wallets`
  - Add `server` export or restructure for Socket.IO integration

---

## 2. Database Models & Indexes

### 2.1 Sale Model (`src/modules/sales/sale.model.js`)

Fields (per architecture v2 §7.5):
- `storeId` (ObjectId ref Store, required)
- `cashierId` (ObjectId ref User, required)
- `customerId` (ObjectId ref Customer, optional)
- `totalAmount` (Number, required)
- `discount` (Number, default: 0)
- `vatAmount` (Number, default: 0)
- `vatRate` (Number, default: 0)
- `paymentMethod` (String, enum: `['cash', 'card', 'credit', 'mixed']`, required)
- `walletId` (ObjectId ref Wallet, optional)
- `paymentBreakdown` (Object, optional: `{ cash, card, credit }`)
- `isCredit` (Boolean, default: false)
- `debtAmount` (Number, default: 0)
- `status` (String, enum: `['completed', 'cancelled']`, default: `'completed'`)
- `saleDate` (Date, default: Date.now)
- `notes` (String, optional)
- `items` (Array of embedded subdocuments):
  - `productId` (ObjectId ref Product, required)
  - `stockId` (ObjectId ref Stock, required)
  - `quantity` (Number, required)
  - `unitPrice` (Number, required)
  - `purchasePrice` (Number, required)
  - `subtotal` (Number, required)
  - `profit` (Number, required)

Indexes:
- `{ storeId: 1, saleDate: -1 }` – for sales listing and daily queries
- `{ storeId: 1, cashierId: 1, saleDate: -1 }` – for cashier history
- `{ status: 1 }` – for filtering active vs cancelled

### 2.2 Customer Model (`src/modules/customers/customer.model.js`)

Fields (per architecture v2 §7.6):
- `storeId` (ObjectId ref Store, required)
- `name` (String, required)
- `phone` (String, required)
- `email` (String, optional)
- `address` (String, optional)
- `creditLimit` (Number, default: 0)
- `currentDebt` (Number, default: 0)
- `loyaltyPoints` (Number, default: 0)
- `birthDate` (Date, optional)
- `allergies` (String, optional)
- `notes` (String, optional)
- Timestamps: `createdAt`, `updatedAt`

Indexes:
- Compound unique: `{ storeId: 1, phone: 1 }`
- Compound: `{ storeId: 1, name: 1 }`

### 2.3 Wallet Model (`src/modules/wallets/wallet.model.js`)

Fields (per architecture v2 §7.8):
- `storeId` (ObjectId ref Store, required)
- `name` (String, required)
- `type` (String, enum: `['cash', 'bank', 'ccp', 'mobile_money', 'customer_deposit']`, required)
- `currency` (String, default: `'MRU'`)
- `balance` (Number, default: 0)
- `minBalance` (Number, default: 0)
- `isActive` (Boolean, default: true)
- `lastReconciliation` (Date, optional)
- Timestamps: `createdAt`, `updatedAt`

Index: `{ storeId: 1 }`

### 2.4 WalletTransaction Model (`src/modules/wallets/walletTransaction.model.js`)

Fields (per architecture v2 §7.9):
- `storeId` (ObjectId ref Store, required)
- `walletId` (ObjectId ref Wallet, required)
- `type` (String, enum: `['credit', 'debit', 'transfer']`, required)
- `amount` (Number, required)
- `balanceAfter` (Number, required)
- `reference` (String, optional – sale ID, transfer ID, etc.)
- `description` (String, optional)
- `userId` (ObjectId ref User, required)
- `timestamp` (Date, default: Date.now)

Indexes:
- `{ walletId: 1, timestamp: -1 }`
- `{ storeId: 1, timestamp: -1 }`

Enforce append-only: block update/delete operations via Mongoose pre-hooks (same pattern as `log.model.js`).

### 2.5 Invoice Model (stub, `src/modules/invoices/invoice.model.js`)

Fields (per architecture v2 §7.10):
- `storeId` (ObjectId ref Store, required)
- `saleId` (ObjectId ref Sale, required, unique)
- `invoiceNumber` (String, required)
- `pdfUrl` (String, optional)
- `sentViaWhatsApp` (Boolean, default: false)
- `sentViaEmail` (Boolean, default: false)
- `sentAt` (Date, optional)
- `whatsappMessageId` (String, optional)
- `emailMessageId` (String, optional)
- `error` (String, optional)
- `status` (String, enum: `['issued', 'cancelled']`, default: `'issued'`)
- `cancelledAt` (Date, optional)
- `whatsappRetryCount` (Number, default: 0)
- Timestamps: `createdAt`, `updatedAt`

Index: `{ storeId: 1, saleId: 1 }`

---

## 3. Invoice Number Generation Utility

- `[ ]` **Create `src/utils/invoiceNumber.js`**:
  - `async function generateInvoiceNumber(storeId, session)` – atomically increment `Store.settings.invoiceNextNumber` via `findOneAndUpdate` with `$inc`, format as `FAC-YYYY-NNNNN` (e.g., `FAC-2025-00123`)
  - Ensure the counter never decrements (even on cancellations)

---

## 4. Sales Endpoints

### 4.1 POST /sales (employee/admin, requires Idempotency-Key)

Request body (Zod validation):
```json
{
  "items": [{ "productId": "65f...", "quantity": 2 }],
  "customerId": "65f...",
  "paymentMethod": "cash",
  "walletId": "65f...",
  "cashGiven": 5000,
  "useLoyaltyPoints": 50
}
```

- `[ ]` Implement **Idempotency-Key** check (reuse existing `idempotency.middleware.js`)
- `[ ]` Implement **`SalesService.createSale()`** with full MongoDB transaction:

  **Step 1 – Validate inputs:**
  - All items reference products that exist and belong to `req.user.storeId`
  - Resolve unit prices from `Product.sellPrice`
  - If `customerId` provided, verify customer exists and belongs to store; load `currentDebt`, `creditLimit`, `loyaltyPoints`
  - If `walletId` provided, verify wallet exists and belongs to store
  - If `useLoyaltyPoints > 0`, validate customer has enough points (use `Store.settings.loyaltyRedeemRate`)

  **Step 2 – FIFO stock selection:**
  - For each item, fetch active stock lots: `Stock.find({ productId, storeId, isActive: true, quantity: { $gt: 0 }, $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }] }).sort({ receptionDate: 1 })`
  - Atomically decrement using `findOneAndUpdate` with `$inc` and `{ quantity: { $gte: needed } }` for each lot
  - Track consumed lots with `stockId`, `purchasePrice`, `quantity` used
  - If total available < requested quantity → throw `INSUFFICIENT_STOCK` (422)

  **Step 3 – Calculate financials:**
  - Compute `subtotal = quantity * unitPrice` per item
  - Compute `profit = subtotal - (quantity * purchasePrice)` per item
  - Compute `totalAmount = sum(subtotals) - discount`
  - Look up `Store.settings.vatRate`, compute `vatAmount = totalAmount * vatRate / (1 + vatRate)`
  - Compute `changeAmount` if `paymentMethod === 'cash'` and `cashGiven > totalAmount`

  **Step 4 – Generate invoice number:**
  - Call `generateInvoiceNumber(storeId, session)` – atomic `$inc` on `Store.settings.invoiceNextNumber`

  **Step 5 – Create documents in transaction:**
  - Create `Sale` document with embedded items (including `stockId`, `purchasePrice`, `profit`)
  - Update wallet:
    - If `paymentMethod === 'cash' | 'card'` and `walletId`: `Wallet.balance += totalAmount` via `$inc`, create `WalletTransaction` (`type: 'credit'`, `reference: saleId`, `balanceAfter`)
    - If `paymentMethod === 'mixed'`: credit `paymentBreakdown.cash + paymentBreakdown.card` to wallet; credit portion stays as debt
  - Update customer debt (if `credit` payment or `isCredit`):
    - If `isCredit`: increment `Customer.currentDebt` by `totalAmount`
    - Validate `currentDebt <= creditLimit` → throw `CREDIT_LIMIT_EXCEEDED` (422)
  - Update loyalty points:
    - Earn: `Customer.loyaltyPoints += floor(totalAmount / 100) * Store.settings.loyaltyPointsPer100`
    - Redeem: if `useLoyaltyPoints > 0`, decrement `Customer.loyaltyPoints` by `useLoyaltyPoints`, reduce `totalAmount` accordingly (or store as discount)
  - Create `Invoice` document with `status: 'issued'`, `invoiceNumber`
  - Append audit log entry for `'sale'` on entity `'Sale'`

  **Step 6 – Post-transaction (after commit):**
  - Queue BullMQ job `invoiceQueue.add('generate', { saleId, invoiceId, storeId })`
  - Emit Socket.IO `sale:new` event to `admin:{storeId}` room with sale summary
  - Emit Socket.IO `dashboard:update` event to `admin:{storeId}`
  - Check stock alerts: for each sold product, check if remaining stock <= `minStock`, emit `alert:stock_critical` or `alert:out_of_stock` as needed

  **Step 7 – Response:**
  ```json
  {
    "success": true,
    "data": {
      "saleId": "65f...",
      "invoiceNumber": "FAC-2025-00123",
      "totalAmount": 3800,
      "changeAmount": 1200,
      "loyaltyPointsEarned": 38,
      "newDebt": 0
    },
    "error": null,
    "meta": null
  }
  ```

### 4.2 GET /sales/me/daily (employee/admin)

- `[ ]` Return current cashier's daily summary:
  - Filter sales where `cashierId = req.user.id`, `storeId = req.user.storeId`, `saleDate >= startOfDay` (local time), `status = 'completed'`
  - Compute: `totalSales` (count), `totalAmount` (sum), `totalProfit` (sum of items.profit), `paymentMethod` breakdown
  - Return inside success envelope

### 4.3 GET /sales/me/history (employee/admin)

- `[ ]` Return paginated sale history for current cashier:
  - Filter: `cashierId = req.user.id`, `storeId = req.user.storeId`
  - Offset pagination: `?page=1&limit=20`
  - Sort by `saleDate: -1` (newest first)
  - **Role-based field restriction**: employee cannot see `purchasePrice` or `profit` in items
  - Return `{ sales, meta: { page, limit, total, hasMore } }`

### 4.4 GET /sales/:id (employee/admin)

- `[ ]` Return single sale detail:
  - Must belong to `req.user.storeId`
  - Populate `customerId` with customer name/phone
  - **Role-based field restriction**: employee cannot see `purchasePrice` or `profit` in items
  - Include related invoice if it exists
  - Return inside success envelope

### 4.5 GET /sales (admin/accountant)

- `[ ]` Return store sales with filters:
  - Query params: `?page=1&limit=20&startDate=&endDate=&cashierId=&paymentMethod=&status=`
  - Always scoped to `req.user.storeId`
  - Sort by `saleDate: -1`
  - Return `{ sales, meta: { page, limit, total, hasMore } }`
  - Accountant role: same access level as admin for sales queries

### 4.6 POST /sales/:id/cancel (admin)

- `[ ]` Cancel a completed sale:
  - Verify sale belongs to `req.user.storeId` and `status === 'completed'`
  - Execute within a **MongoDB transaction**:
    1. Set `sale.status = 'cancelled'`, record `cancelledAt`
    2. Reverse stock: increment each stock lot's quantity back by the sold quantity (use `findOneAndUpdate` with `$inc`)
    3. Reverse wallet credit: decrement `Wallet.balance` by `totalAmount` (if wallet was credited), create `WalletTransaction` (`type: 'debit'`, `reference: saleId`)
    4. Reverse customer debt: decrement `Customer.currentDebt` by `debtAmount`
    5. Reverse loyalty points: decrement earned points, return redeemed points
    6. Mark invoice `status = 'cancelled'`, set `cancelledAt`
    7. Append audit log entry for `'sale_cancel'`
  - Emit Socket.IO `dashboard:update`
  - Return success envelope

---

## 5. Customer Endpoints (Minimal for Phase 3)

- `[ ]` **`POST /customers`** (employee/admin) – Create customer (needed for POS flow)
  - Zod validation: `name`, `phone`, `creditLimit`, etc.
  - Check phone uniqueness per store (409 `DUPLICATE_ENTRY`)
  - Scoped to `req.user.storeId`

- `[ ]` **`GET /customers/search?q=`** (employee/admin) – Search by name/phone
  - Scoped to `req.user.storeId`
  - Offset pagination
  - Return customer array

- `[ ]` **`GET /customers/:id`** (employee/admin) – Customer detail with debt and loyalty info

---

## 6. Wallet Endpoints (Minimal for Phase 3 – needed for sale payment)

- `[ ]` **`POST /wallets`** (admin) – Create wallet
  - Zod validation: `name`, `type`, `minBalance`
  - Scoped to `req.user.storeId`

- `[ ]` **`GET /wallets`** (admin/accountant) – List wallets for store
  - Filter active wallets
  - Return balance, lastReconciliation, etc.

---

## 7. Socket.IO Implementation (src/socket/)

- `[ ]` **`socket.server.js`**:
  - Initialize Socket.IO server with `cors` and `path: '/socket.io'`
  - JWT authentication middleware on connection (read `auth.token` from handshake)
  - On successful auth, join sockets to rooms:
    - `store:{storeId}`
    - `admin:{storeId}` (if role is `admin` or `accountant`)
    - `employee:{userId}`
  - Export helper: `emitToStore(io, storeId, event, payload)` and `emitToAdmin(io, storeId, event, payload)`

- `[ ]` Wire into `server.js`: pass HTTP server to `initSocket()`, store `io` instance on `app.set('io', io)` for controller access

---

## 8. BullMQ Job Wiring

- `[ ]` **`queue.service.js`**:
  - Connect to Redis with `Ioredis`
  - Create `invoiceQueue = new Queue('invoice-generation', { connection })`
  - Export `invoiceQueue` and connection

- `[ ]` **`invoice.job.js`** (worker):
  - `new Worker('invoice-generation', async job => { /* Phase 6: PDF gen, WhatsApp, email */ }, { connection })`
  - Phase 3: log job data, update invoice `pdfUrl` placeholder, mark `sentViaWhatsApp = false`
  - Handle failures: increment `whatsappRetryCount`, set `error` field

- `[ ]` Wire worker in `server.js` or a separate `worker.js` entry point

---

## 9. Sales Controller & Routes

- `[ ]` **`src/modules/sales/sale.controller.js`**:
  - `createSale` – parse Zod body, call `SalesService.createSale()`, return response
  - `getDailySummary` – query aggregation, return results
  - `getMyHistory` – query with pagination, apply role-based field stripping
  - `getSaleById` – query with populate, role-based field stripping
  - `listSales` – query with filters and pagination
  - `cancelSale` – parse params, call service cancel method

- `[ ]` **`src/modules/sales/sale.routes.js`**:
  ```
  POST   /                -> createSale       (employee/admin, idempotent)
  GET    /me/daily        -> getDailySummary   (employee/admin)
  GET    /me/history      -> getMyHistory      (employee/admin)
  GET    /:id             -> getSaleById       (employee/admin)
  GET    /                -> listSales         (admin/accountant)
  POST   /:id/cancel      -> cancelSale        (admin)
  ```

---

## 10. Quality Assurance & Integration Tests

- `[ ]` **Sale Creation Tests**:
  - Test successful cash sale creates Sale document with embedded items
  - Test FIFO stock decrement selects oldest lots first
  - Test insufficient stock returns 422 `INSUFFICIENT_STOCK`
  - Test cash sale with walletId credits wallet balance and creates WalletTransaction
  - Test credit sale increments customer debt
  - Test credit sale exceeding creditLimit returns 422 `CREDIT_LIMIT_EXCEEDED`
  - Test loyalty points earned on sale (earn)
  - Test loyalty points redeemed on sale (redeem)
  - Test mixed payment method creates correct wallet credit and debt
  - Test invoice document is created with correct `invoiceNumber`

- `[ ]` **Idempotency Tests**:
  - Verify duplicate `Idempotency-Key` with same body returns cached response (200)
  - Verify reused `Idempotency-Key` with different body returns 409 `IDEMPOTENCY_KEY_REUSED`

- `[ ]` **Transaction Rollback Tests**:
  - Test that if stock decrement fails mid-way, no Sale, WalletTransaction, or Customer changes persist
  - Test that sale is rolled back if invoiceNumber generation fails

- `[ ]` **Sale Cancellation Tests**:
  - Test cancel restores stock quantities
  - Test cancel reverses wallet credit
  - Test cancel reverses customer debt
  - Test invoice marked as `cancelled`
  - Test double cancel returns `INVALID_STATE` (409)

- `[ ]` **Role & Store Isolation Tests**:
  - Test employee can create sale but cannot see `purchasePrice`/`profit` in response
  - Test user from Store A cannot access sales from Store B
  - Test accountant can list sales

- `[ ]` **Socket.IO Event Tests**:
  - Verify `sale:new` event emitted after successful sale (integration test with Socket.IO client)

- `[ ]` **BullMQ Job Tests**:
  - Verify invoice generation job is queued after sale creation
