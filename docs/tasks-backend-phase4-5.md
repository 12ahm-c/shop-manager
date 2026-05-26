# Phase 4-5 — Backend Customers, Debts, Loyalty, Suppliers, Wallets & Finance

Based on `docs/backend-plan.md` v2.0 §7 (Phase 4 + Phase 5), `docs/architecture.md` v2.0, and `docs/API-contract.md` v2.0.

Legend: `[x]` = implemented, `[ ]` = pending

---

## 1. Phase 4 — Customers, Loyalty & Debts

### 1.1 Customer Model & Base Endpoints (already done in Phase 3)
- `[x]` Customer model with `currentDebt`, `creditLimit`, `loyaltyPoints`
- `[x]` `POST /customers` — Create customer (employee/admin)
- `[x]` `GET /customers/search?q=` — Search by name/phone (employee/admin)
- `[x]` `GET /customers/:id` — Detail with debt, loyalty, recent purchases (employee/admin)

### 1.2 `POST /customers/:id/debt/pay` — Debt Payment (employee/admin, idempotent)
- `[ ]` Zod validation: `amount` (positive number, required), `walletId` (required)
- `[ ]` Idempotency-Key check (listed in API-contract §1.3)
- `[ ]` MongoDB transaction:
  1. Validate customer exists, belongs to store, `currentDebt >= amount`
  2. Validate wallet exists, is active, belongs to store, `balance >= amount`
  3. Decrement `Customer.currentDebt` by `amount` using `$inc`
  4. Decrement `Wallet.balance` by `amount` using `$inc`
  5. Create `WalletTransaction` (type: `'debit'`, reference: customer ID, description: `"Debt payment for {customer.name}"`)
  6. Append audit log (`action: 'payment'`, `entity: 'Customer'`)
- `[ ]` Post-commit: emit `dashboard:update`
- `[ ]` Check low-wallet alert: if `wallet.balance <= wallet.minBalance` after debit, create notification + emit `alert:low_wallet`
- `[ ]` Error codes: `NOT_FOUND` (404), `INSUFFICIENT_BALANCE` (422), `IDEMPOTENCY_KEY_REUSED` (409)

### 1.3 `GET /customers/debt/overdue` — Overdue Debt Query (admin)
- `[ ]` Query customers where `currentDebt > 0`
- `[ ]` Join with sales to find `lastSaleDate` (most recent sale for each customer)
- `[ ]` Compute aging buckets:
  - 30-45 days: `warning`
  - 45-60 days: `critical`
  - 60+ days: `overdue`
- `[ ]` Offset pagination, scoped to `req.user.storeId`
- `[ ]` Return: `[{ customer, currentDebt, lastSaleDate, agingBucket }]` with `meta`

### 1.4 `POST /customers/:id/loyalty/redeem` — Loyalty Redemption (employee/admin)
- `[ ]` Zod validation: `points` (positive integer, required), `saleId` (optional, preview mode)
- `[ ]` Validate customer exists, belongs to store, has enough `loyaltyPoints`
- `[ ]` Look up `Store.settings.loyaltyRedeemRate` (e.g., 1 point = 1 MRU discount)
- `[ ]` Preview mode (if `saleId` provided):
  - Return `{ discountAmount: points * redeemRate }` without mutating anything
- `[ ]` Direct redeem (if no `saleId`):
  - Decrement `Customer.loyaltyPoints` by `points` using `$inc`
  - No wallet/cash effect — points are a discount applied at sale time via `useLoyaltyPoints`
  - Append audit log (`action: 'payment'`, `entity: 'Customer'`)
- `[ ]` Error codes: `NOT_FOUND` (404), `INSUFFICIENT_POINTS` (422), `VALIDATION_ERROR` (400)

### 1.5 Debt Reminder Job
- `[ ]` Create `src/jobs/debtReminder.job.js`:
  - Query customers with `currentDebt > 0` where last sale > 30 days ago
  - Group by aging: 30d, 45d, 60d+
  - Create `Notification` documents for admin
  - Emit `alert:debt_overdue` to `admin:{storeId}`
- `[ ]` Wire in `server.js` with a cron-like scheduler (BullMQ repeatable job or setInterval)
- `[ ]` Anti-spam: max 1 overdue notification per customer per day

---

## 2. Phase 5 — Suppliers, Wallets & Finance

### 2.1 Supplier Endpoints

#### 2.1.1 Supplier Model (`src/modules/suppliers/supplier.model.js`)
- `[x]` Fields: `storeId`, `name`, `phone`, `email`, `address`, `currentDebt`, `notes`
- `[x]` Index: `{ storeId: 1, name: 1 }`

#### 2.1.2 `POST /suppliers` — Create Supplier (admin)
- `[ ]` Zod validation: `name` (required), `phone`, `email`, `address`, `notes`
- `[ ]` Check name uniqueness per store (optional, 409 `DUPLICATE_ENTRY`)
- `[ ]` Scoped to `req.user.storeId`

#### 2.1.3 `GET /suppliers` — List Suppliers (admin)
- `[ ]` Offset pagination, scoped to store
- `[ ]` Return suppliers with `currentDebt` and `totalPurchases` (aggregated from stock receipts)
- `[ ]` Optional filter: `?q=` for name search

#### 2.1.4 `GET /suppliers/:id/debt` — Supplier Debt Detail (admin/accountant)
- `[ ]` Return supplier profile + `currentDebt` + recent stock receipts (last 20)
- `[ ]` Scoped to store, 404 if not found

#### 2.1.5 `POST /suppliers/:id/pay` — Pay Supplier Debt (admin, idempotent)
- `[ ]` Zod validation: `amount` (positive number, required), `walletId` (required), `description` (optional)
- `[ ]` Idempotency-Key check (listed in API-contract §1.3)
- `[ ]` MongoDB transaction:
  1. Validate supplier exists, belongs to store, `currentDebt >= amount`
  2. Validate wallet exists, is active, belongs to store, `balance >= amount`
  3. Decrement `Supplier.currentDebt` by `amount`
  4. Decrement `Wallet.balance` by `amount`
  5. Create `WalletTransaction` (type: `'debit'`, reference: supplier ID, description: `"Supplier payment to {supplier.name}"`)
  6. Append audit log (`action: 'payment'`, `entity: 'Supplier'`)
- `[ ]` Post-commit: emit `dashboard:update`, check low-wallet alert
- `[ ]` Error codes: `NOT_FOUND` (404), `INSUFFICIENT_BALANCE` (422), `IDEMPOTENCY_KEY_REUSED` (409)

### 2.2 Wallet Endpoints

#### 2.2.1 Wallet & WalletTransaction Models
- `[x]` Wallet model: `storeId`, `name`, `type`, `currency`, `balance`, `minBalance`, `isActive`, `lastReconciliation`
- `[x]` WalletTransaction model: append-only with pre-hooks blocking update/delete

#### 2.2.2 Wallet CRUD (already done in Phase 3)
- `[x]` `POST /wallets` — Create wallet (admin)
- `[x]` `GET /wallets` — List active wallets (admin/accountant)

#### 2.2.3 `POST /wallets/transfer` — Wallet Transfer (admin, idempotent)
- `[ ]` Zod validation: `fromWalletId` (required), `toWalletId` (required), `amount` (positive number, required), `description` (optional)
- `[ ]` Must not allow transfer to same wallet (validation error)
- `[ ]` Idempotency-Key check
- `[ ]` MongoDB transaction:
  1. Validate both wallets exist, are active, belong to store
  2. Check `fromWallet.balance >= amount`
  3. Debit source: `$inc: { balance: -amount }`
  4. Credit destination: `$inc: { balance: +amount }`
  5. Create WalletTransaction for source (type: `'transfer'`, amount: negative context)
  6. Create WalletTransaction for destination (type: `'transfer'`, amount: positive context)
  7. Append audit log (`action: 'payment'`, `entity: 'Wallet'`)
- `[ ]` Post-commit:
  - Check low-wallet alert on source wallet
  - Emit `dashboard:update`
- `[ ]` Error codes: `NOT_FOUND` (404), `INSUFFICIENT_BALANCE` (422), `VALIDATION_ERROR` (400)

#### 2.2.4 `GET /wallets/:id/transactions` — Wallet Transactions (admin/accountant)
- `[ ]` Cursor pagination (`?cursor=&limit=20`) — cursor = last `_id` from previous page
- `[ ]` Filter by `walletId`, scoped to store
- `[ ]` Sort by `timestamp: -1` (newest first)
- `[ ]` Return `{ transactions, meta: { nextCursor, hasMore, limit } }`

#### 2.2.5 `POST /wallets/:id/reconcile` — Wallet Reconciliation (accountant)
- `[ ]` Zod validation: `closingBalance` (number, required), `notes` (optional)
- `[ ]` Validate wallet exists, belongs to store
- `[ ]` Update `Wallet.lastReconciliation` to now
- `[ ]` Append audit log (`action: 'settings_change'`, `entity: 'Wallet'`)
- `[ ]` Return `{ walletId, lastReconciliation, closingBalance }`

### 2.3 Invoice Endpoints

#### 2.3.1 Invoice Model (already done in Phase 3)
- `[x]` Fields: `storeId`, `saleId`, `invoiceNumber`, `pdfUrl`, `sentViaWhatsApp`, `sentViaEmail`, `sentAt`, `whatsappMessageId`, `emailMessageId`, `error`, `status`, `cancelledAt`, `whatsappRetryCount`

#### 2.3.2 `GET /invoices/:id` — Get Invoice by ID (employee/admin/accountant)
- `[ ]` Return invoice detail with signed PDF URL (if available)
- `[ ]` Scoped to store
- `[ ]` Populate related sale (read-only summary: totalAmount, saleDate, cashierId)

#### 2.3.3 `GET /invoices/sale/:saleId` — Get Invoice by Sale (employee/admin/accountant)
- `[ ]` Look up invoice by `saleId`, scoped to store
- `[ ]` Same response shape as `/invoices/:id`

#### 2.3.4 `POST /invoices/:id/resend` — Resend Invoice (employee/admin)
- `[ ]` Re-queue BullMQ invoice generation job for the given invoice
- `[ ]` Reset `error` field, increment retry counter
- `[ ]` Scoped to store

### 2.4 Report Endpoints

#### 2.4.1 `GET /reports/daily-cash` — Daily Cash Report (admin/accountant)
- `[ ]` Query params: `date` (default: today), `format` (json | pdf | xlsx)
- `[ ]` Aggregation pipeline:
  - Sales for the given date, `status = 'completed'`
  - Group by `paymentMethod`
  - Compute: `totalSales`, `totalCash`, `totalCard`, `totalCredit`, `totalProfit`
  - Wallet balances snapshot
- `[ ]` Return report object or trigger async PDF/XLSX generation

#### 2.4.2 `GET /reports/profitability` — Profitability Report (admin/accountant)
- `[ ]` Query params: `startDate`, `endDate` (required), `format`
- `[ ]` Aggregation:
  - Sum of `items.profit` across all sales in date range
  - Group by product category: revenue, cost, profit, margin %
  - Total `vatAmount`, `discount`
- `[ ]` Return data or trigger async generation

#### 2.4.3 `GET /reports/top-products` — Top Products Report (admin/accountant)
- `[ ]` Query params: `startDate`, `endDate`, `limit` (default: 10), `format`
- `[ ]` Aggregation:
  - Unwind `sales.items`, group by `productId`
  - Compute: total quantity sold, total revenue, total profit
  - Sort by quantity or revenue descending, limit
  - Populate product names
- `[ ]` Return top products list

#### 2.4.4 `GET /reports/aging` — Debt Aging Report (admin/accountant)
- `[ ]` Customer aging: customers with `currentDebt > 0`, grouped by 0-30d, 30-45d, 45-60d, 60d+
- `[ ]` Supplier aging: suppliers with `currentDebt > 0`, same buckets
- `[ ]` Return `{ customers: { buckets, total }, suppliers: { buckets, total } }`

### 2.5 Dashboard Endpoints

#### 2.5.1 `GET /dashboard/employee` — Employee KPI Dashboard (employee/admin)
- `[ ]` Return today's stats for the logged-in cashier:
  - `totalSales` (count), `totalAmount`, `totalProfit`
  - Top 5 products sold today
  - `paymentMethod` breakdown
- `[ ]` No caching (real-time per request)

#### 2.5.2 `GET /dashboard/admin?period=` — Admin Dashboard (admin)
- `[ ]` Query param: `period` (today | week | month | custom with startDate/endDate)
- `[ ]` Return:
  - `revenue` (total sales amount)
  - `totalSales` (count)
  - `totalProfit`
  - `activeStockAlerts` (count of critical + out_of_stock)
  - `totalCustomers`, `totalDebt`
  - `walletBalances` (sum per wallet type)
  - `topProducts` (top 5 by revenue)
- `[ ]` Redis cache: key `dashboard:admin:{storeId}:{period}`, TTL 5 min
- `[ ]` Invalidate cache on `sale:new`, `dashboard:update` events

#### 2.5.3 `GET /dashboard/financial` — Financial Dashboard (accountant/admin)
- `[ ]` Return:
  - `totalRevenue` (period: this month)
  - `totalProfit` and margin %
  - `customerDebtTotal`
  - `supplierDebtTotal`
  - `walletBalances` with `minBalance` warnings
  - `pendingInvoices` count
- `[ ]` Redis cache: key `dashboard:financial:{storeId}`, TTL 10 min

### 2.6 Notification Endpoints

#### 2.6.1 Notification Model (new — `src/modules/notifications/notification.model.js`)
- `[ ]` Fields per architecture v2 §7.11:
  - `storeId` (ref Store, required)
  - `type` (enum: `stock_critical`, `out_of_stock`, `debt_overdue`, `low_wallet`, `whatsapp_failed`)
  - `message` (String, required)
  - `targetRole` (enum: `admin`, `employee`, `accountant`)
  - `targetUserId` (ref User, optional — for personal notifications)
  - `isRead` (Boolean, default: false)
  - `relatedEntity` (Object: `{ productId, stockId, customerId, supplierId, walletId }`)
  - `createdAt` (Date, default: now)
- `[ ]` Indexes: `{ storeId: 1, targetRole: 1, isRead: 1 }`, `{ targetUserId: 1, isRead: 1 }`

#### 2.6.2 `GET /notifications/me` — My Notifications (employee/admin/accountant)
- `[ ]` Return notifications for the user: by `targetUserId` OR (by `targetRole` and no `targetUserId`)
- `[ ]` Offset pagination, sorted by `createdAt: -1`
- `[ ]` `?unread=true` filter to show only unread
- `[ ]` Return `{ notifications, meta }`

#### 2.6.3 `PATCH /notifications/:id/read` — Mark One Read (owner/admin)
- `[ ]` Validate notification belongs to user or user is admin
- `[ ]` Set `isRead = true`

#### 2.6.4 `PATCH /notifications/read-all` — Mark All Read (authenticated)
- `[ ]` Set `isRead = true` for all notifications matching the user

#### 2.6.5 `GET /admin/alerts` — System Alerts (admin)
- `[ ]` Return unresolved/active alerts (notifications where `isRead = false`)
- `[ ]` Aggregate by type: count of `stock_critical`, `out_of_stock`, `low_wallet`, `debt_overdue`
- `[ ]` Grouped for admin alert banner display

### 2.7 Financial Audit Logs
- `[x]` Log model exists with append-only enforcement
- `[ ]` Wire audit logs for:
  - Supplier debt payment (`action: 'payment'`, `entity: 'Supplier'`)
  - Wallet transfer (`action: 'payment'`, `entity: 'Wallet'`)
  - Wallet reconciliation (`action: 'settings_change'`, `entity: 'Wallet'`)
  - Debt payment (`action: 'payment'`, `entity: 'Customer'`) — already partially wired
  - Supplier creation (`action: 'import'`, `entity: 'Supplier'`)
- `[ ]` Wire IP and userAgent capture from `req` in controllers

### 2.8 Low-Wallet Alert Hooks
- `[ ]` Create `alert.service.js` or helper function `checkLowWallet(wallet, storeId)`:
  - After any wallet debit operation, check if `wallet.balance <= wallet.minBalance`
  - If true, create `Notification` (type: `low_wallet`)
  - Emit `alert:low_wallet` to `admin:{storeId}` via Socket.IO
- `[ ]` Wire into:
  - `POST /customers/:id/debt/pay` (wallet debit)
  - `POST /suppliers/:id/pay` (wallet debit)
  - `POST /wallets/transfer` (source wallet debit)
  - Sale cancellation (wallet debit reversal)

---

## 3. App Wiring Summary

### 3.1 Route Registration (`src/app.js`)
- `[x]` `/v1/sales`, `/v1/customers`, `/v1/wallets` — already mounted
- `[ ]` Mount `/v1/suppliers` — supplier routes
- `[ ]` Mount `/v1/invoices` — invoice routes
- `[ ]` Mount `/v1/reports` — report routes
- `[ ]` Mount `/v1/dashboard` — dashboard routes
- `[ ]` Mount `/v1/notifications` — notification routes
- `[ ]` Mount `/v1/admin/alerts` — admin alerts (or add to existing admin routes)

### 3.2 New Module Structure
```
src/modules/
├── suppliers/
│   ├── supplier.model.js        [x]
│   ├── supplier.controller.js   [ ]
│   ├── supplier.routes.js       [ ]
│   └── supplier.service.js      [ ]
├── wallets/
│   ├── wallet.model.js          [x]
│   ├── wallet.controller.js     [x] (partial: create, list)
│   ├── wallet.routes.js         [x] (partial)
│   └── walletTransaction.model.js [x]
├── invoices/
│   ├── invoice.model.js         [x]
│   ├── invoice.controller.js    [ ]
│   └── invoice.routes.js        [ ]
├── reports/
│   ├── report.controller.js     [ ]
│   └── report.routes.js         [ ]
├── dashboard/
│   ├── dashboard.controller.js  [ ]
│   └── dashboard.routes.js      [ ]
└── notifications/
    ├── notification.model.js    [ ]
    ├── notification.controller.js [ ]
    └── notification.routes.js   [ ]
```

---

## 4. Quality Assurance & Integration Tests

### 4.1 Customer Debt Payment Tests
- `[ ]` Test successful debt payment decrements `Customer.currentDebt` and `Wallet.balance`
- `[ ]` Test wallet transaction created with correct `type: 'debit'` and `balanceAfter`
- `[ ]` Test payment exceeding `currentDebt` returns error (or cap at remaining debt)
- `[ ]` Test payment with insufficient wallet balance returns 422
- `[ ]` Test customer from another store cannot be paid for
- `[ ]` Test atomic rollback: wallet decrement fails → customer debt unchanged

### 4.2 Overdue Debt Tests
- `[ ]` Test query returns only customers with `currentDebt > 0` and old last sale
- `[ ]` Test aging buckets are correctly calculated (30/45/60+ days)
- `[ ]` Test store isolation: store A overdue not visible to store B

### 4.3 Loyalty Redemption Tests
- `[ ]` Test preview mode returns discount amount without mutating points
- `[ ]` Test direct redeem decrements `loyaltyPoints`
- `[ ]` Test redemption with insufficient points returns 422
- `[ ]` Test redemption for customer from another store returns 404

### 4.4 Supplier Endpoint Tests
- `[ ]` Test supplier create succeeds with required fields
- `[ ]` Test supplier list returns paginated results
- `[ ]` Test supplier debt detail returns correct `currentDebt`
- `[ ]` Test supplier debt payment decrements debt and wallet atomically
- `[ ]` Test store isolation on all supplier endpoints

### 4.5 Wallet Transfer Tests
- `[ ]` Test successful transfer creates two WalletTransaction records
- `[ ]` Test transfer with insufficient balance returns 422
- `[ ]` Test transfer to same wallet returns validation error
- `[ ]` Test transfer between stores is blocked
- `[ ]` Test atomic rollback: destination credit fails → source debit reversed

### 4.6 Wallet Reconciliation Tests
- `[ ]` Test reconciliation updates `lastReconciliation` date
- `[ ]` Test audit log is created with correct action/entity

### 4.7 Invoice Endpoint Tests
- `[ ]` Test get invoice by ID returns correct invoice
- `[ ]` Test get invoice by saleId returns correct invoice
- `[ ]` Test resend increments retry count and resets error
- `[ ]` Test invoice from another store returns 404

### 4.8 Report Tests
- `[ ]` Test daily cash report returns correct totals grouped by payment method
- `[ ]` Test profitability report aggregates profit correctly
- `[ ]` Test top-products report returns correct ranking
- `[ ]` Test aging report includes both customer and supplier buckets

### 4.9 Dashboard Tests
- `[ ]` Test employee dashboard returns only current cashier's stats
- `[ ]` Test admin dashboard returns store-wide KPIs
- `[ ]` Test financial dashboard returns wallet and debt summaries
- `[ ]` Test Redis cache is used and invalidated appropriately

### 4.10 Notification Tests
- `[ ]` Test notification creation with correct type and target
- `[ ]` Test mark single notification as read
- `[ ]` Test mark all notifications as read
- `[ ]` Test admin alerts aggregate by type correctly

### 4.11 Low-Wallet Alert Tests
- `[ ]` Test alert created when balance drops to or below `minBalance`
- `[ ]` Test no alert created when balance stays above `minBalance`
- `[ ]` Test `alert:low_wallet` Socket.IO event emitted

### 4.12 Role & Store Isolation Tests
- `[ ]` Test accountant can access reports and wallet transactions (read-only)
- `[ ]` Test employee cannot access reports or financial dashboards
- `[ ]` Test accountant cannot create wallets or suppliers
- `[ ]` Test admin can access all Phase 4-5 endpoints
