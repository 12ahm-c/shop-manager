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
- [ ] Invoice detail/download view (`/invoices/:id`)
- [ ] Invoice status display (pending, generated, sent, failed)
- [ ] Resend invoice action button (WhatsApp/email requeue)
- [ ] Reports page with date/period filters (`/admin/reports`, `/accountant/reports`)
- [ ] Report file downloads (PDF/XLSX)

### API Integration
- [ ] `GET /invoices/:id` — retrieve signed PDF URL
- [ ] `GET /invoices/sale/:saleId` — invoice for a specific sale
- [ ] `POST /invoices/:id/resend` — requeue WhatsApp/email send
- [ ] `GET /reports/daily-cash` — PDF/XLSX daily cash report
- [ ] `GET /reports/profitability` — margin report
- [ ] `GET /reports/top-products` — top products report
- [ ] `GET /reports/aging` — customer/supplier debt aging

### API Client
- [ ] Create `src/api/invoices.js` with invoice endpoint functions
- [ ] Create `src/api/reports.js` with report endpoint functions

### Routes
- [ ] Add `/invoices/:id` route (employee/admin/accountant)
- [ ] Add `/admin/reports` route (admin)
- [ ] Add `/accountant/reports` route (accountant)

### UX Requirements
- [ ] Loading, error, empty, and success states for all views
- [ ] Role guard: employee/admin/accountant for invoices, admin/accountant for reports
- [ ] Bilingual labels (French/Arabic) for invoice and report screens

---

## Phase 7 - Dashboard, Alerts, AI

### Dashboard Screens
- [ ] Employee dashboard (`/dashboard`) — cashier KPIs (daily sales, items sold, revenue)
- [ ] Admin dashboard (`/admin/dashboard`) — store KPIs with period selector (today/week/month)
- [ ] Accountant dashboard (`/accountant/dashboard`) — financial KPIs

### Notification Center
- [ ] Notification center screen (`/notifications`)
- [ ] Header unread notification badge (count)
- [ ] Mark single notification as read
- [ ] Mark all notifications as read
- [ ] Admin alerts page (`/admin/alerts`)

### Realtime Socket.IO Integration
- [ ] Socket.IO client connection with auth token and storeId
- [ ] Listen for `sale:new` event (admin notification)
- [ ] Listen for `dashboard:update` event (auto-refresh dashboard data)
- [ ] Listen for `alert:stock_critical` event (stock alert notification)
- [ ] Listen for `alert:out_of_stock` event (out-of-stock notification)
- [ ] Listen for `alert:debt_overdue` event (admin debt reminder)
- [ ] Listen for `alert:low_wallet` event (admin/accountant alert)
- [ ] Listen for `ai:response` event (AI chat streaming)
- [ ] Create `notificationStore` Zustand store (in-app notifications, unread count, realtime alerts)

### AI Chat
- [ ] AI chat page/panel (`/ai`)
- [ ] Chat message input and response display
- [ ] Suggested questions/prompts
- [ ] Optional chart rendering in AI responses
- [ ] RBAC: employees cannot access sensitive financial answers

### API Integration
- [ ] `GET /dashboard/employee` — cashier KPIs
- [ ] `GET /dashboard/admin?period=` — store KPIs with period filter
- [ ] `GET /dashboard/financial` — financial KPIs
- [ ] `POST /ai/chat` — natural-language question
- [ ] `GET /ai/suggestions` — suggested prompts
- [ ] `GET /ai/health` — LLM provider health check (admin)
- [ ] `GET /notifications/me` — own notifications
- [ ] `PATCH /notifications/:id/read` — mark one read
- [ ] `PATCH /notifications/read-all` — mark all read
- [ ] `GET /admin/alerts` — system alerts

### API Client
- [ ] Update `src/api/dashboard.js` with full dashboard endpoint functions
- [ ] Create `src/api/ai.js` with AI endpoint functions
- [ ] Create `src/api/notifications.js` with notification endpoint functions

### Routes
- [ ] Replace dashboard placeholder with real Employee dashboard
- [ ] Add `/notifications` route (all authenticated roles)
- [ ] Add `/ai` route (employee/admin)
- [ ] Add `/admin/alerts` route (admin)

### UX Requirements
- [ ] Loading, error, empty, and success states for all views
- [ ] Period selector component for admin dashboard (today/week/month)
- [ ] Role guards on all new routes
- [ ] Bilingual labels (French/Arabic) for dashboard, notification, and AI screens

---

## Phase 8 - Production Hardening

### Accessibility
- [ ] Semantic HTML review across all screens
- [ ] Keyboard navigation support on interactive elements
- [ ] Visible focus states on all focusable elements
- [ ] Sufficient color contrast (WCAG AA minimum)
- [ ] ARIA labels on icons, modals, and non-text controls

### Responsive Design
- [ ] POS screen tablet/mobile layout pass
- [ ] Dashboard responsive layout pass
- [ ] All admin forms responsive on small screens
- [ ] Navigation sidebar collapse/hamburger on mobile
- [ ] Table components: horizontal scroll or card layout on narrow screens

### Performance
- [ ] Lazy-loaded routes (`React.lazy` + `Suspense`)
- [ ] Code-splitting per phase/feature group
- [ ] Production build verification (`npm run build` passes cleanly)

### Error & State Handling Audit
- [ ] Consistent empty state illustrations/messages across all list views
- [ ] Consistent error state display with retry action across all views
- [ ] Consistent loading skeletons/spinners across all views

### Socket.IO Resilience
- [ ] Socket reconnect with exponential backoff
- [ ] Graceful handling of connection drops (UI indicator)
- [ ] Automatic re-subscription to rooms after reconnect

### Bilingual / RTL Audit
- [ ] All visible strings use i18n keys (no hardcoded text)
- [ ] RTL layout renders correctly for Arabic
- [ ] Language switcher persists preference

### Linting & Build
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run build` produces valid production bundle
- [ ] No console warnings or errors in production build

### Security Review
- [ ] No sensitive data in Zustand stores or localStorage (tokens handled securely)
- [ ] All API calls go through central `src/api/client.js`
- [ ] `purchasePrice` and `profit` fields hidden for employee role in all views
- [ ] `Idempotency-Key` sent for all required mutation endpoints

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
