# Phase 1 - Auth and App Shell Tasks

Based on `docs/frontend-plan.md`.

## 1. Project Setup & Core State
- `[x]` Configure central API client/adapter (no raw `fetch` in components).
- `[x]` Setup mock backend layer that strictly mirrors the API contract (Section 6 rules).
- `[x]` Initialize Zustand stores:
  - `[x]` `authStore`: User, role, store, tokens/session state.
  - `[x]` `languageStore`: Current language, direction (`ltr`/`rtl`).
  - `[x]` `uiStore`: Sidebar, modals, toasts, loading flags.
- `[x]` Setup i18n configuration for French and Arabic.

## 2. API & Mocks Implementation
*Ensure mock responses return `{ success, data, error, meta }` and follow contract formats.*
- `[x]` Implement `POST /auth/login` adapter & mock.
- `[x]` Implement `POST /auth/refresh` adapter & mock.
- `[x]` Implement `POST /auth/logout` adapter & mock.
- `[x]` Implement `GET /auth/me` adapter & mock.
- `[x]` Implement `GET/PATCH /users/me` adapter & mock.
- `[x]` Implement `GET/POST/PATCH /admin/employees` adapter & mock.

## 3. UI Components & App Shell
- `[x]` Build Language Switcher component and RTL-aware shell logic.
- `[x]` Build Authenticated Layout shell (`/dashboard`, etc.).
- `[x]` Implement Role-Based Navigation:
  - `[x]` Block unauthorized roles from restricted pages.
  - `[x]` Route guards to redirect unauthenticated users to `/login`.

## 4. Screens & Features
- `[x]` **Login Screen** (`/login`):
  - `[x]` Phone number input (E.164 format).
  - `[x]` Password input.
  - `[x]` Store selection/input.
  - `[x]` Session refresh and logout handling.
- `[x]` **Profile Page** (`/profile`):
  - `[x]` Display current user information.
  - `[x]` Allow updating profile info (`PATCH /users/me`).
- `[x]` **Admin Employee Management** (`/admin/employees`):
  - `[x]` View list of employees.
  - `[x]` Create, update and delete employees.

## 5. Quality & Definition of Done
- `[x]` Implement loading, error, empty, and success states for all async views.
- `[x]` Ensure accessible semantic HTML, keyboard support, and focus states.
- `[x]` Run and pass `npm run lint`, `npm run typecheck`, and `npm run build`.

# Phase 2 - POS and Sales Tasks

Based on `docs/frontend-plan.md`.

## 1. Core State
- `[x]` Initialize/Update Zustand stores:
  - `[x]` `cartStore`: POS cart, selected customer, payment method, wallet, cash given, loyalty usage.
  - `[x]` `walletStore`: Wallet list/cache for payment and finance views.

## 2. API & Mocks Implementation
*Ensure mock responses return `{ success, data, error, meta }` and follow contract formats.*
- `[x]` Implement `GET /products/search` adapter & mock.
- `[x]` Implement `GET /wallets` adapter & mock.
- `[x]` Implement `GET /customers/search` adapter & mock.
- `[x]` Implement `POST /customers` adapter & mock.
- `[x]` Implement `POST /customers/:id/loyalty/redeem` adapter & mock.
- `[x]` Implement `POST /sales` adapter & mock (must support `Idempotency-Key`).
- `[x]` Implement `GET /sales/me/daily` adapter & mock.

## 3. POS Screen (`/pos`)
- `[x]` **Product Search & Add**:
  - `[x]` Barcode/text search input.
  - `[x]` Add to cart functionality.
- `[x]` **Cart & Customer**:
  - `[x]` Cart UI with item quantity controls.
  - `[x]` Customer attach and quick create form.
  - `[x]` Loyalty redemption check/call before sale when used.
- `[x]` **Payment & Submission**:
  - `[x]` Payment method selection (cash, card, credit, mixed).
  - `[x]` Wallet selection.
  - `[x]` Cash given input and change calculation/display.
  - `[x]` Sale submission passing `Idempotency-Key`.
  - `[x]` Sale success screen with receipt summary.

## 4. Quality & Definition of Done
- `[x]` Implement loading, error, empty, and success states for all async views.
- `[x]` Ensure employee UI hides sensitive financial/stock-cost fields (if any on POS).
- `[x]` Bilingual (French/Arabic) and RTL layout verification.
- `[x]` Run and pass `npm run lint`, `npm run typecheck`, and `npm run build`.

# Phase 3 - Products and Unified Stock Tasks

Based on `docs/frontend-plan.md`.

## 1. Core State
- `[x]` Initialize/Update Zustand stores:
  - `[x]` `productStore`: Product search cache and recently viewed products.

## 2. API & Mocks Implementation
*Ensure mock responses return `{ success, data, error, meta }` and follow contract formats. Use architecture v2 `stock` terminology, not `stock_batches`.*
- `[x]` Implement `POST /products` adapter & mock.
- `[x]` Implement `GET /products/search` adapter & mock (if not already done in Phase 2).
- `[x]` Implement `GET /products/:id` adapter & mock.
- `[x]` Implement `PUT /products/:id` adapter & mock.
- `[x]` Implement `DELETE /products/:id` adapter & mock.
- `[x]` Implement `POST /products/import` adapter & mock.
- `[x]` Implement `POST /stock/receive` adapter & mock (must support `Idempotency-Key`).
- `[x]` Implement `POST /stock/adjust` adapter & mock (must support `Idempotency-Key`).
- `[x]` Implement `GET /stock/:productId` adapter & mock.
- `[x]` Implement `POST /stock/transfer` adapter & mock.

## 3. Product Management Screens
- `[x]` **Product Search & List** (`/products`):
  - `[x]` Search by name, barcode, or category.
  - `[x]` Display product list.
- `[x]` **Product Detail** (`/products/:id`):
  - `[x]` View product details and aggregated stock.
  - `[x]` Active stock lots list via `GET /stock/:productId`.
- `[x]` **Admin Product Actions** (`/admin/products/new`, `/admin/products/:id/edit`):
  - `[x]` Product creation form.
  - `[x]` Product update form.
  - `[x]` CSV/Excel import UI.

## 4. Unified Stock Management Screens
- `[x]` **Stock Receipt** (`/admin/stock/receive`):
  - `[x]` Form to record supplier receipts.
  - `[x]` Include submission with `Idempotency-Key`.
- `[x]` **Stock Adjustment** (`/admin/stock/adjust`):
  - `[x]` Form for manual adjustment on a stock lot.
  - `[x]` Include submission with `Idempotency-Key`.
- `[x]` **Stock Transfer** (`/admin/stock/transfer`):
  - `[x]` Form to transfer stock between stores.

## 5. Quality & Definition of Done
- `[x]` Verify frontend language strictly uses "stock lots" or "stock entries" (not "stock_batches").
- `[x]` Implement loading, error, empty, and success states for all async views.
- `[x]` Employee UI hides sensitive financial/stock-cost fields (e.g., `purchasePrice`).
- `[x]` Run and pass `npm run lint`, `npm run typecheck`, and `npm run build`.

# Phase 4 - Customers, Loyalty, Debts Tasks

Based on `docs/frontend-plan.md`.

## 1. Core State
- `[ ]` Initialize/Update Zustand stores:
  - `[ ]` Ensure `cartStore` and `walletStore` integrate properly with new debt and loyalty data if required.

## 2. API & Mocks Implementation
*Ensure mock responses return `{ success, data, error, meta }` and follow contract formats.*
- `[ ]` Implement `GET /customers/:id` adapter & mock.
- `[ ]` Implement `POST /customers/:id/debt/pay` adapter & mock (must support `Idempotency-Key`).
- `[ ]` Implement `GET /customers/debt/overdue` adapter & mock.

## 3. Customer Management Screens
- `[ ]` **Customer Profile** (`/customers/:id`):
  - `[ ]` View profile details.
  - `[ ]` Display debt, credit limit, and loyalty points.
  - `[ ]` Display purchase history.
- `[ ]` **Debt Payment Form**:
  - `[ ]` Interface for customers to pay off debt.
  - `[ ]` Submission passing `Idempotency-Key`.
- `[ ]` **Admin Overdue Debts** (`/admin/debts`):
  - `[ ]` Admin view showing customers with debt older than 30 days.

## 4. Quality & Definition of Done
- `[ ]` Implement loading, error, empty, and success states for all async views.
- `[ ]` Bilingual (French/Arabic) and RTL layout verification for new screens.
- `[ ]` Run and pass `npm run lint`, `npm run typecheck`, and `npm run build`.
