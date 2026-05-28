# ShopManager Pro - Frontend Tasks

> Tracks frontend deliverables per phase from `docs/frontend-plan.md`.
> Phases 1–5 are complete. Phases 6–8 remain.

---

## Phase 1 - Auth and App Shell ✅

- [x] Login screen (phone, password, store selection)
- [x] Logout and session refresh handling
- [x] Authenticated layout with role-based navigation
- [x] Profile page
- [x] Admin employee management (list/create/update)
- [x] Language switcher and RTL-aware shell
- [x] AuthGuard for route protection

### API Integration
- [x] `POST /auth/login`
- [x] `POST /auth/refresh`
- [x] `POST /auth/logout`
- [x] `GET /auth/me`
- [x] `GET/PATCH /users/me`
- [x] `GET/POST/PATCH /admin/employees`

---

## Phase 2 - POS and Sales ✅

- [x] POS screen with barcode/text search
- [x] Cart with quantity controls
- [x] Customer attach/quick create
- [x] Payment method selection (cash, card, credit, mixed)
- [x] Wallet selection
- [x] Cash given/change display
- [x] Loyalty redemption call before sale when used
- [x] Sale submit with `Idempotency-Key`
- [x] Sale success/receipt summary

### API Integration
- [x] `GET /products/search`
- [x] `GET /wallets`
- [x] `GET /customers/search`
- [x] `POST /customers`
- [x] `POST /customers/:id/loyalty/redeem`
- [x] `POST /sales`
- [x] `GET /sales/me/daily`

---

## Phase 3 - Products and Unified Stock ✅

- [x] Product search/list/detail
- [x] Product create/edit for admin
- [x] Product stock detail using `GET /stock/:productId`
- [x] Stock receipt form (creates `stock` lot documents)
- [x] Stock adjustment form
- [x] Stock transfer page

### API Integration
- [x] Product endpoints from API contract section 4
- [x] Stock endpoints from API contract section 5

---

## Phase 4 - Customers, Loyalty, Debts ✅

- [x] Customer search and detail
- [x] Debt and credit limit display
- [x] Loyalty points display
- [x] Purchase history
- [x] Debt payment form (modal)
- [x] Admin overdue debts view

### API Integration
- [x] Customer endpoints from API contract section 7

---

## Phase 5 - Suppliers, Wallets, Finance ✅

- [x] Supplier list/create/detail/debt/payment
- [x] Wallet overview
- [x] Wallet transaction history with cursor pagination
- [x] Wallet transfer form
- [x] Accountant reconciliation form
- [x] Financial dashboard shell

### API Integration
- [x] Supplier endpoints from API contract section 8
- [x] Wallet endpoints from API contract section 9

---

## Phase 6 - Invoices, Reports, Communications

### Screens
- [x] Invoice detail/download view (`/invoices/:id`)
- [x] Invoice status display (pending, generated, sent, failed)
- [x] Resend invoice action button (WhatsApp/email requeue)
- [x] Reports page with date/period filters (`/admin/reports`, `/accountant/reports`)
- [x] Report file downloads (PDF/XLSX)

### API Integration
- [x] `GET /invoices/:id` — retrieve signed PDF URL
- [x] `GET /invoices/sale/:saleId` — invoice for a specific sale
- [x] `POST /invoices/:id/resend` — requeue WhatsApp/email send
- [x] `GET /reports/daily-cash` — PDF/XLSX daily cash report
- [x] `GET /reports/profitability` — margin report
- [x] `GET /reports/top-products` — top products report
- [x] `GET /reports/aging` — customer/supplier debt aging

### API Client
- [x] Create `src/api/invoices.js` with invoice endpoint functions
- [x] Create `src/api/reports.js` with report endpoint functions

### Routes
- [x] Add `/invoices/:id` route (employee/admin/accountant)
- [x] Add `/admin/reports` route (admin)
- [x] Add `/accountant/reports` route (accountant)

### UX Requirements
- [x] Loading, error, empty, and success states for all views
- [x] Role guard: employee/admin/accountant for invoices, admin/accountant for reports
- [x] Bilingual labels (French/Arabic) for invoice and report screens

---

## Phase 7 - Dashboard, Alerts, AI

### Dashboard Screens
- [x] Employee dashboard (`/dashboard`) — cashier KPIs (daily sales, items sold, revenue)
- [x] Admin dashboard (`/admin/dashboard`) — store KPIs with period selector (today/week/month)
- [x] Accountant dashboard (`/accountant/dashboard`) — financial KPIs

### Notification Center
- [x] Notification center screen (`/notifications`)
- [x] Header unread notification badge (count)
- [x] Mark single notification as read
- [x] Mark all notifications as read
- [x] Admin alerts page (`/admin/alerts`)

### Realtime Socket.IO Integration
- [x] Socket.IO client connection with auth token and storeId
- [x] Listen for `sale:new` event (admin notification)
- [x] Listen for `dashboard:update` event (auto-refresh dashboard data)
- [x] Listen for `alert:stock_critical` event (stock alert notification)
- [x] Listen for `alert:out_of_stock` event (out-of-stock notification)
- [x] Listen for `alert:debt_overdue` event (admin debt reminder)
- [x] Listen for `alert:low_wallet` event (admin/accountant alert)
- [x] Listen for `ai:response` event (AI chat streaming)
- [x] Create `notificationStore` Zustand store (in-app notifications, unread count, realtime alerts)

### AI Chat
- [x] AI chat page/panel (`/ai`)
- [x] Chat message input and response display
- [x] Suggested questions/prompts
- [x] Optional chart rendering in AI responses
- [x] RBAC: employees cannot access sensitive financial answers

### API Integration
- [x] `GET /dashboard/employee` — cashier KPIs
- [x] `GET /dashboard/admin?period=` — store KPIs with period filter
- [x] `GET /dashboard/financial` — financial KPIs
- [x] `POST /ai/chat` — natural-language question
- [x] `GET /ai/suggestions` — suggested prompts
- [x] `GET /ai/health` — LLM provider health check (admin)
- [x] `GET /notifications/me` — own notifications
- [x] `PATCH /notifications/:id/read` — mark one read
- [x] `PATCH /notifications/read-all` — mark all read
- [x] `GET /admin/alerts` — system alerts

### API Client
- [x] Update `src/api/dashboard.js` with full dashboard endpoint functions
- [x] Create `src/api/ai.js` with AI endpoint functions
- [x] Create `src/api/notifications.js` with notification endpoint functions

### Routes
- [x] Replace dashboard placeholder with real Employee dashboard
- [x] Add `/notifications` route (all authenticated roles)
- [x] Add `/ai` route (employee/admin)
- [x] Add `/admin/alerts` route (admin)

### UX Requirements
- [x] Loading, error, empty, and success states for all views
- [x] Period selector component for admin dashboard (today/week/month)
- [x] Role guards on all new routes
- [x] Bilingual labels (French/Arabic) for dashboard, notification, and AI screens

---

## Phase 8 - Production Hardening

### Accessibility
- [x] Semantic HTML review across all screens
- [x] Keyboard navigation support on interactive elements
- [x] Visible focus states on all focusable elements
- [x] Sufficient color contrast (WCAG AA minimum)
- [x] ARIA labels on icons, modals, and non-text controls

### Responsive Design
- [x] POS screen tablet/mobile layout pass
- [x] Dashboard responsive layout pass
- [x] All admin forms responsive on small screens
- [x] Navigation sidebar collapse/hamburger on mobile
- [x] Table components: horizontal scroll or card layout on narrow screens

### Performance
- [x] Lazy-loaded routes (`React.lazy` + `Suspense`)
- [x] Code-splitting per phase/feature group
- [x] Production build verification (`npm run build` passes cleanly)

### Error & State Handling Audit
- [x] Consistent empty state illustrations/messages across all list views
- [x] Consistent error state display with retry action across all views
- [x] Consistent loading skeletons/spinners across all views

### Socket.IO Resilience
- [x] Socket reconnect with exponential backoff
- [x] Graceful handling of connection drops (UI indicator)
- [x] Automatic re-subscription to rooms after reconnect

### Bilingual / RTL Audit
- [x] All visible strings use i18n keys (no hardcoded text)
- [x] RTL layout renders correctly for Arabic
- [x] Language switcher persists preference

### Linting & Build
- [x] `npm run lint` passes with zero errors
- [x] `npm run build` produces valid production bundle
- [x] No console warnings or errors in production build

### Security Review
- [x] No sensitive data in Zustand stores or localStorage (tokens handled securely)
- [x] All API calls go through central `src/api/client.js`
- [x] `purchasePrice` and `profit` fields hidden for employee role in all views
- [x] `Idempotency-Key` sent for all required mutation endpoints

---

## Routes Summary (remaining)

| Route | Phase | Role | Screen |
|-------|-------|------|--------|
| `/invoices/:id` | 6 | employee/admin/accountant | InvoiceDetailScreen |
| `/admin/reports` | 6 | admin | ReportsScreen |
| `/accountant/reports` | 6 | accountant | ReportsScreen |
| `/dashboard` | 7 | employee/admin | EmployeeDashboardScreen |
| `/admin/dashboard` | 7 | admin | AdminDashboardScreen |
| `/accountant/dashboard` | 7 | accountant | AccountantDashboardScreen |
| `/notifications` | 7 | all authenticated | NotificationsScreen |
| `/ai` | 7 | employee/admin | AiChatScreen |
| `/admin/alerts` | 7 | admin | AdminAlertsScreen |

---

## New Files to Create (remaining)

| File | Phase | Purpose |
|------|-------|---------|
| `src/api/invoices.js` | 6 | Invoice API client |
| `src/api/reports.js` | 6 | Reports API client |
| `src/screens/InvoiceDetailScreen.jsx` | 6 | Invoice view/download/resend |
| `src/screens/ReportsScreen.jsx` | 6 | Reports with filters and downloads |
| `src/api/ai.js` | 7 | AI assistant API client |
| `src/api/notifications.js` | 7 | Notifications API client |
| `src/screens/EmployeeDashboardScreen.jsx` | 7 | Employee KPIs dashboard |
| `src/screens/AdminDashboardScreen.jsx` | 7 | Admin KPIs dashboard |
| `src/screens/AccountantDashboardScreen.jsx` | 7 | Accountant financial dashboard |
| `src/screens/NotificationsScreen.jsx` | 7 | Notification center |
| `src/screens/AdminAlertsScreen.jsx` | 7 | System alerts page |
| `src/screens/AiChatScreen.jsx` | 7 | AI chat panel |
| `src/stores/notificationStore.js` | 7 | Notification Zustand store |
| `src/lib/socket.js` | 7 | Socket.IO client setup |
