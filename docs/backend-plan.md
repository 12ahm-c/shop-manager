# SHOPMANAGER PRO - Backend Team Plan

**Version 2.0**  
**Aligned with `docs/architecture.md` v2.0 and `docs/API-contract.md` v2.0**  
**December 2025**

---

## 1. Purpose

This document guides backend implementation for the ShopManager Pro modular monolith. Backend work must preserve:

- The API contract in `docs/API-contract.md`.
- The business architecture and data model in `docs/architecture.md`.
- Transactional integrity for sales, stock, wallets, debts, invoices, and logs.
- RBAC, auditability, idempotency, and multi-store isolation.

No endpoint, DTO field, Socket.IO event, collection, environment variable, or dependency may be added without updating the relevant source document first.

---

## 2. Ownership

Backend owns:

- `shopmanager-backend/**` or the backend application under `apps/backend/**`.
- Express REST API and Socket.IO server.
- Mongoose models and indexes.
- Business services.
- BullMQ queues and workers.
- Cron jobs.
- Backend tests.
- Shared DTO/validation exports when a shared package exists.

Backend does not own frontend UI behavior except where an API contract or RBAC rule requires it.

---

## 3. Runtime

From the project root, expected local commands are:

```bash
npm run dev
npm run dev:worker
```

Local dependencies:

```text
MongoDB: mongodb://localhost:27017/shopmanager
Redis:   redis://localhost:6379
API:     http://localhost:3001/v1
Socket:  http://localhost:3001
```

PDF generation, WhatsApp/email delivery, reports, backups, debt reminders, syncRetry, and AI work must run through BullMQ or cron workers when asynchronous behavior is required.

---

## 4. Backend Rules

| Rule | Requirement |
|------|-------------|
| Controllers | HTTP mapping, Zod validation, auth context, service call, response envelope only |
| Services | All business logic: sales, FIFO, wallets, debts, loyalty, invoices, alerts, imports, AI |
| Models | Schemas, indexes, basic hooks only; no workflow logic |
| Response format | `{ success, data, error, meta }` except `204` |
| Auth | Phone/password login with `storeId`; JWT + refresh token |
| RBAC | Central middleware for `employee`, `admin`, `accountant` |
| Store isolation | Every query that reads/writes store-owned data must filter by `storeId` |
| Idempotency | Required on the critical mutation endpoints listed in the API contract |
| Transactions | MongoDB transactions for sales, stock receipt, stock adjustment, wallet transfer, debt payment, supplier payment |
| Logs | Append-only collection; no update/delete path |
| Files | Durable documents go to object storage in production; local disk is dev-only |
| Realtime | REST mutates state; Socket.IO only broadcasts authenticated events |

---

## 5. Architecture v2 Data Model Rules

Backend implementation must use the architecture v2 collections:

- `stores`
- `users`
- `employees`
- `products`
- `stock`
- `sales`
- `customers`
- `suppliers`
- `wallets`
- `wallet_transactions`
- `invoices`
- `notifications`
- `logs`

Important removals from earlier plans:

- Do not create `stock_batches`.
- Do not create `stock_movements`.
- Do not create `sale_items`.
- Sale line items are embedded in `sales.items`.
- Stock lots are represented by documents in the unified `stock` collection.

FIFO is implemented by selecting active `stock` documents for the product/store, ordered by `receptionDate`, then atomically decrementing quantities in a transaction.

---

## 6. Contract Compatibility

Every endpoint must match `docs/API-contract.md` exactly:

- Path and method.
- Auth requirement and role.
- Request shape.
- Response envelope.
- Error codes.
- Pagination style.
- Socket.IO event names and payloads.

Backend handoff for each completed endpoint must include:

- Method and path.
- Required role.
- Sample success response.
- Possible error codes.
- Test account or token notes.

If implementation cannot match the contract, stop and update the contract through a separate approved docs task.

---

## 7. Implementation Phases

### Phase 1 - Auth, Stores, Users, Employees

Deliver:

- `User`, `Store`, `Employee`, refresh-token storage.
- `POST /auth/login` with `{ phone, password, storeId }`.
- `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- `GET/PATCH /users/me`.
- `GET/POST/PATCH /admin/employees`.
- Auth, RBAC, store isolation, login rate limit.
- Login/logout audit logs.

Validation:

- JWT includes `{ sub, role, storeId, iat, exp }`.
- Refresh tokens rotate and can be revoked.
- Employees cannot access admin employee management.

### Phase 2 - Products and Unified Stock

Deliver:

- `Product` model and indexes.
- `Stock` model using architecture v2 fields.
- Product CRUD/search/import endpoints.
- Stock receipt, adjustment, product stock list, transfer endpoints.
- Supplier debt update on stock receipt.

Validation:

- Active stock is aggregated from `stock`.
- Expired/inactive stock is excluded from sales.
- Employees do not receive `purchasePrice`.

### Phase 3 - Sales Pipeline

Deliver:

- `Sale` model with embedded `items`.
- `SalesService.createSale()` using MongoDB transaction and idempotency.
- FIFO stock selection/decrement from `stock`.
- Wallet credit or customer debt update.
- Loyalty points earn/redeem.
- Invoice job queued through BullMQ.
- Alerts and Socket.IO events.

Validation:

- No stock quantity goes negative.
- Reusing an idempotency key does not duplicate a sale.
- Sale response includes `saleId`, `invoiceNumber`, `changeAmount`, and loyalty/debt results.

### Phase 4 - Customers, Loyalty, Debts

Deliver:

- `Customer` model with `currentDebt`, `creditLimit`, `loyaltyPoints`.
- Customer create/search/detail endpoints.
- Debt payment endpoint with wallet transaction.
- Overdue debt query.
- Loyalty redemption endpoint.

Validation:

- Credit sale cannot exceed `creditLimit`.
- Debt payment and wallet transaction commit atomically.

### Phase 5 - Suppliers, Wallets, Finance

Deliver:

- `Supplier`, `Wallet`, `WalletTransaction` models.
- Supplier list/create/debt/payment endpoints.
- Wallet create/list/transfer/transactions/reconcile endpoints.
- Financial audit logs.

Validation:

- `wallet_transactions` is append-only.
- Transfers produce debit and credit effects in one transaction.
- Low wallet notifications are generated when `balance <= minBalance`.

### Phase 6 - Invoices, Documents, Notifications

Deliver:

- `Invoice` model.
- PDF generation with Puppeteer and template cache.
- WhatsApp and email services.
- Invoice retrieval and resend endpoints.
- Notification endpoints and anti-spam rules.

Validation:

- Sales do not block on PDF/WhatsApp/email work.
- Invoice send failures are stored and retryable.

### Phase 7 - Dashboard, Reports, AI

Deliver:

- Dashboard endpoints.
- Reports with MongoDB aggregations and ExcelJS/PDF generation.
- AI chat/suggestions/health endpoints.
- LLM service with RBAC-aware tool execution.
- Socket.IO `ai:response`.

Validation:

- AI always filters by `storeId`.
- Employees cannot request sensitive financial answers.
- Dashboard cache invalidates after sale events.

### Phase 8 - Hardening

Deliver:

- Rate limits.
- Health check.
- Backups and restore scripts.
- Integration tests for sales/FIFO/wallets/debts.
- Structured logs.
- Production readiness checklist.

---

## 8. Definition of Done

Backend work is done when:

- Contract and architecture documents were checked.
- Endpoint/event behavior matches `docs/API-contract.md`.
- Business logic lives in services.
- Critical operations use MongoDB transactions.
- Idempotency is implemented where required.
- RBAC and `storeId` isolation are tested.
- Audit logs are written for critical actions.
- `npm run lint`, `npm run typecheck`, and relevant tests pass, or skipped verification is explicitly documented.

---

End of Backend Team Plan - SHOPMANAGER PRO v2.0
