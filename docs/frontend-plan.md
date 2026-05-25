# SHOPMANAGER PRO - Frontend Team Plan

**Version 2.0**  
**Aligned with `docs/architecture.md` v2.0 and `docs/API-contract.md` v2.0**  
**December 2025**

---

## 1. Purpose

This document lets the frontend team build in parallel with backend while avoiding contract drift. Frontend may create screens, states, mocks, and adapters, but must not invent endpoints, DTO fields, error codes, business rules, Socket.IO events, roles, or environment variables.

Sources of truth:

- API shapes, errors, idempotency, pagination, Socket.IO: `docs/API-contract.md`
- Business rules and architecture: `docs/architecture.md`
- Delivery sequence: `docs/master-plan.md`
- Backend responsibilities: `docs/backend-plan.md`

---

## 2. Ownership

Frontend owns:

- `shopmanager-frontend/**` or the frontend application under `apps/frontend/**`.
- React + Vite app shell.
- Tailwind styling.
- Role-based navigation.
- API client/adapters.
- Zustand stores.
- Frontend tests and UI docs.

Frontend must not import backend modules or duplicate backend business logic.

---

## 3. Runtime

```bash
npm run dev
```

Expected local URLs:

```text
Frontend: http://localhost:5173
REST API: http://localhost:3001/v1
Socket:   http://localhost:3001
```

Environment variables may override these in staging/production. Only public browser configuration may use `VITE_*`.

---

## 4. Frontend Rules

- Use the central API client; components should not scatter raw `fetch` calls.
- Every async view must handle loading, error, empty, and success states.
- Mock data must match `docs/API-contract.md` exactly.
- All critical mutations must send `Idempotency-Key` when the contract requires it.
- Backend remains authoritative for stock, price, credit limits, loyalty points, wallet balances, and permissions.
- Do not render `purchasePrice` or `profit` for employees, even if a bad response includes them.
- Use Socket.IO for realtime notifications only; state-changing actions go through REST.
- Support the bilingual UI in the architecture: French and Arabic via i18n and a language switcher.
- Use accessible semantic HTML, keyboard support, visible focus states, and sufficient contrast.

---

## 5. State Management

Zustand stores should stay aligned with the architecture:

| Store | Responsibility |
|-------|----------------|
| `authStore` | User, role, store, tokens/session state |
| `cartStore` | POS cart, selected customer, payment method, wallet, cash given, loyalty usage |
| `notificationStore` | In-app notifications, unread count, realtime alerts |
| `languageStore` | Current language, direction (`ltr`/`rtl`) |
| `uiStore` | Sidebar, modals, toasts, loading flags |
| `walletStore` | Wallet list/cache for payment and finance views |
| `productStore` | Product search cache and recently viewed products |

Add a new global store only with approval.

---

## 6. Mock and Backend Swap Rules

Mocks are allowed before backend endpoints exist if:

- Response uses `{ success, data, error, meta }`.
- IDs are 24-character ObjectId strings.
- Timestamps are ISO 8601 UTC strings.
- Amounts are integer local currency units.
- Phone numbers use E.164.
- Socket events use only names from API contract section 15.
- The mock is behind the API client/adapter layer.

Replacing a mock with the real backend should require changing the adapter/data source, not rewriting screens.

---

## 7. Feature Phases

### Phase 1 - Auth and App Shell

Deliver:

- Login screen using phone, password, and store selection/input.
- Logout and session refresh handling.
- Authenticated layout with role-based navigation.
- Profile page.
- Admin employee management.
- Language switcher and RTL-aware shell.

Key endpoints:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET/PATCH /users/me`
- `GET/POST/PATCH /admin/employees`

### Phase 2 - POS and Sales

Deliver:

- POS screen with barcode/text search.
- Cart with quantity controls.
- Customer attach/quick create.
- Payment method: cash, card, credit, mixed.
- Wallet selection.
- Cash given/change display.
- Loyalty redemption call before sale when used.
- Sale submit with `Idempotency-Key`.
- Sale success/receipt summary.

Key endpoints:

- `GET /products/search`
- `GET /wallets`
- `GET /customers/search`
- `POST /customers`
- `POST /customers/:id/loyalty/redeem`
- `POST /sales`
- `GET /sales/me/daily`

### Phase 3 - Products and Unified Stock

Deliver:

- Product search/list/detail.
- Product create/edit/import for admin.
- Product stock detail using `GET /stock/:productId`.
- Stock receipt form that creates architecture v2 `stock` lot documents.
- Stock adjustment form.
- Expiring stock page.
- Stock transfer page.

Key endpoints:

- Product endpoints from API contract section 4.
- Stock endpoints from API contract section 5.

Frontend language must use "stock lots" or "stock entries", not the old `stock_batches` term.

### Phase 4 - Customers, Loyalty, Debts

Deliver:

- Customer search and detail.
- Debt and credit limit display.
- Loyalty points display.
- Purchase history.
- Debt payment form.
- Admin overdue debts view.

Key endpoints:

- Customer endpoints from API contract section 7.

### Phase 5 - Suppliers, Wallets, Finance

Deliver:

- Supplier list/create/detail/debt/payment.
- Wallet overview.
- Wallet transaction history with cursor pagination.
- Wallet transfer form.
- Accountant reconciliation form.
- Financial dashboard shell.

Key endpoints:

- Supplier endpoints from API contract section 8.
- Wallet endpoints from API contract section 9.

### Phase 6 - Invoices, Reports, Communications

Deliver:

- Invoice detail/download view.
- Invoice status display.
- Resend invoice action.
- Reports page with date/period filters and file downloads.

Key endpoints:

- Invoice/report endpoints from API contract section 10.

### Phase 7 - Dashboard, Alerts, AI

Deliver:

- Employee dashboard.
- Admin dashboard with period selector.
- Accountant dashboard.
- Notification center.
- Realtime Socket.IO integration.
- AI chat panel/page with suggestions and optional charts.

Key endpoints/events:

- Dashboard endpoints from API contract section 11.
- AI endpoints from API contract section 12.
- Notification endpoints from API contract section 13.
- Socket rooms/events from API contract section 15.

### Phase 8 - Production Hardening

Deliver:

- Accessibility pass.
- Responsive pass, especially POS on tablet/mobile.
- Lazy-loaded routes.
- Consistent empty/error/loading states.
- Socket reconnect/backoff.
- Build verification.

---

## 8. Suggested Routes

```text
/login
/dashboard
/pos
/products
/products/:id
/customers
/customers/:id
/invoices/:id
/notifications
/ai
/profile

/admin/dashboard
/admin/employees
/admin/products/new
/admin/products/:id/edit
/admin/stock/receive
/admin/stock/adjust
/admin/stock/expiring
/admin/stock/transfer
/admin/suppliers
/admin/suppliers/:id
/admin/wallets
/admin/wallets/:id
/admin/wallets/transfer
/admin/debts
/admin/reports
/admin/alerts
/admin/logs
/admin/settings
/admin/backup
/admin/stores

/accountant/dashboard
/accountant/wallets
/accountant/wallets/:id/reconcile
/accountant/reports
```

Route guards must redirect unauthenticated users to `/login` and block roles from unauthorized pages.

---

## 9. Definition of Done

Frontend work is done when:

- It uses documented endpoints/events only.
- It goes through the central API client/adapter.
- Mocks, if present, match the contract exactly.
- Async states are implemented.
- Role guards are implemented.
- `Idempotency-Key` is sent for required mutations.
- Employee UI hides sensitive financial/stock-cost fields.
- Bilingual/RTL behavior is considered for visible screens.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass, or skipped verification is documented.

---

End of Frontend Team Plan - SHOPMANAGER PRO v2.0
