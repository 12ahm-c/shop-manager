# SHOPMANAGER PRO - Master Delivery Plan

**Version 2.0**  
**Aligned with `docs/architecture.md` v2.0**  
**December 2025**

---

## 1. Vision

ShopManager Pro is a universal retail management system for stores that need sales, stock, customers, debts, wallets, invoices, alerts, reports, and an AI assistant in one realtime web platform.

Architecture v2 anchors the product around:

- Modular Node.js/Express backend.
- React/Vite frontend.
- MongoDB with ACID transactions.
- Unified `stock` collection for FIFO stock lots.
- Sales with embedded `items`.
- Wallets and immutable wallet transactions.
- In-app, WhatsApp, and email notifications.
- Socket.IO realtime updates.
- BullMQ asynchronous jobs.
- French/Arabic UI.

---

## 2. Execution Principles

| Principle | Application |
|-----------|-------------|
| Architecture first | `docs/architecture.md` defines data model and business rules |
| API first | `docs/API-contract.md` defines integration behavior |
| Backend is authoritative | Stock, credit, loyalty, wallet, security, and totals are backend-owned |
| Frontend is contract-bound | UI may mock only documented shapes |
| Incremental delivery | Each milestone must be deployable and testable |
| Critical flows require tests | Sales, stock, wallets, debts, auth, logs, invoices |
| No stale model usage | Do not implement `stock_batches`, `stock_movements`, or `sale_items` |

---

## 3. Milestones Overview

| Milestone | Name | Duration | Core Result |
|-----------|------|----------|-------------|
| M1 | Foundations | 2 weeks | Auth, stores, users, employees, RBAC |
| M2 | Commerce Core | 3 weeks | Products, unified stock, POS sales |
| M3 | Customers | 2 weeks | Loyalty, customer debt, history |
| M4 | Finance | 2 weeks | Wallets, suppliers, financial reports |
| M5 | Documents & Notifications | 2 weeks | Invoices, PDF, WhatsApp/email, alerts |
| M6 | Intelligence | 2 weeks | AI assistant, advanced dashboards |
| M7 | Production Hardening | 2 weeks | Logs, backups, monitoring, load/security validation |

Estimated total: 15 weeks for a 3-4 developer team.

---

## 4. M1 - Foundations

Goal: secure multi-store base with accounts and employee management.

Backend:

- `Store`, `User`, `Employee` models.
- Phone/password login with `storeId`.
- JWT + refresh token rotation.
- Auth/RBAC/store-isolation middleware.
- `GET /auth/me`, profile endpoints.
- Admin employee management.
- Login/logout audit logs.

Frontend:

- Login screen.
- Authenticated shell.
- Role-based navigation.
- Profile page.
- Admin employee list/create/update.
- Language switcher and RTL-ready layout.

Validation:

- Employee cannot access admin routes.
- Token refresh works.
- Login attempts are rate-limited.
- Audit logs are written.

---

## 5. M2 - Commerce Core

Goal: complete product/stock/POS sale flow using architecture v2.

Backend:

- Product CRUD/search/import.
- Unified `stock` model and endpoints.
- Stock receipt, adjustment, transfer, expiring stock.
- Supplier debt increment on stock receipt.
- `Sale` model with embedded `items`.
- Sale transaction with FIFO stock decrement.
- Wallet/customer debt update.
- Invoice job enqueue.
- `sale:new`, `dashboard:update`, stock alert events.

Frontend:

- POS screen with product search/barcode flow.
- Cart and payment UI.
- Wallet selection.
- Customer attach.
- Sale submit with idempotency.
- Product and stock management screens.
- Employee dashboard basics.

Validation:

- No stock goes negative under concurrent sales.
- Sale response is idempotent.
- Employee cannot see stock cost fields.
- Stock is aggregated from `stock`, not old batch/movement collections.

---

## 6. M3 - Customers, Loyalty, Debts

Goal: manage customer relationship and credit flows.

Backend:

- Customer model with `currentDebt`, `creditLimit`, `loyaltyPoints`.
- Customer search/detail/history.
- Debt payment endpoint.
- Loyalty redemption endpoint.
- Overdue debt query and reminder job.

Frontend:

- Customer search/create/detail.
- POS customer attachment.
- Loyalty point display and redemption.
- Debt payment form.
- Admin overdue debt screen.

Validation:

- Credit limit enforcement returns `CREDIT_LIMIT_EXCEEDED`.
- Debt payments update wallet and customer debt atomically.
- Loyalty points are adjusted by backend rules.

---

## 7. M4 - Finance

Goal: track money flows and supplier obligations.

Backend:

- Supplier endpoints and supplier debt payment.
- Wallet endpoints.
- Immutable `wallet_transactions`.
- Wallet transfer transaction.
- Accountant reconciliation.
- Daily cash, profitability, top-products, and aging reports.

Frontend:

- Supplier management.
- Wallet overview/detail/transfer.
- Accountant reconciliation.
- Report filters and downloads.
- Financial dashboard shell.

Validation:

- Wallet transfers create correct balances and audit trails.
- Supplier payment decreases debt.
- Reports match sale, wallet, and debt data.

---

## 8. M5 - Documents and Notifications

Goal: automate invoices, communication, and alerts.

Backend:

- Invoice model.
- PDF generation with Puppeteer.
- WhatsApp and email services.
- Invoice resend endpoint.
- Notification endpoints.
- Alert anti-spam rules.
- Expiry, debt, low-wallet, stock-critical jobs/events.

Frontend:

- Invoice detail/download/resend.
- Notification center.
- Header unread badge.
- Admin alerts page.
- Realtime alert handling.

Validation:

- Sale does not block on PDF/WhatsApp/email.
- Failed sends are retryable.
- Socket.IO events reach the right role/user rooms.

---

## 9. M6 - Intelligence and Dashboards

Goal: deliver AI assistant and deeper analytics.

Backend:

- AI chat/suggestions/health endpoints.
- Intent mapping and safe MongoDB aggregations.
- LLM provider integration.
- RBAC filtering for financial questions.
- Admin and accountant dashboards with Redis cache.

Frontend:

- AI chat page/panel.
- Suggested questions.
- Chart rendering in responses.
- Admin dashboard.
- Accountant dashboard.

Validation:

- AI queries are filtered by `storeId`.
- Employees cannot retrieve sensitive financial insights.
- Dashboard cache invalidates after sale updates.

---

## 10. M7 - Production Hardening

Goal: prepare for real operation.

Backend/Infra:

- Health checks.
- Rate limits.
- Structured logs.
- Backups and restore scripts.
- Monitoring dashboards and alerts.
- Integration tests for critical flows.
- Load tests.
- Deployment runbook.

Frontend:

- Accessibility review.
- Responsive review.
- Production build verification.
- Reconnect/backoff behavior for Socket.IO.
- Error/empty/loading state audit.

Validation:

- Restore rehearsal succeeds.
- Load test meets agreed thresholds.
- Critical test suite passes.
- Production secrets and environment separation are verified.

---

## 11. Test Strategy

| Type | Scope | Tools |
|------|-------|-------|
| Unit | Services, utilities, UI helpers | Jest/Vitest |
| Integration | Auth, sales, stock FIFO, wallets, debts | Supertest, MongoDB test DB |
| E2E | Login, POS sale, stock receipt, invoice view | Playwright/Cypress |
| Load | Sales and dashboard paths | k6/Artillery |
| Contract | Endpoint envelopes and DTOs | Postman/Bruno/OpenAPI checks |

Required critical tests:

- Sale transaction commits all changes or none.
- FIFO selects correct `stock` documents.
- Wallet transfer is atomic.
- Debt payment is atomic.
- Logs are append-only.
- RBAC hides sensitive fields.

---

## 12. Risks

| Risk | Mitigation |
|------|------------|
| Contract drift | API contract review before frontend/backend merge |
| Old stock model returns | Stale term scan for `stock_batches`, `stock_movements`, `sale_items` |
| FIFO contention | Atomic updates and concurrency tests |
| PDF/WhatsApp failures | BullMQ retries and resend endpoint |
| LLM failures | Timeout and clear fallback message |
| Data loss | Backups, restore rehearsal, append-only logs |

---

## 13. Milestone Definition of Done

A milestone is complete when:

- Backend endpoints/events match `docs/API-contract.md`.
- Data model matches `docs/architecture.md`.
- Frontend uses real endpoints or contract-accurate mocks.
- Critical operations have tests.
- RBAC and store isolation are verified.
- Socket.IO events work where expected.
- Documentation handoff includes endpoint examples, known limitations, and verification notes.

---

End of Master Delivery Plan - SHOPMANAGER PRO v2.0
