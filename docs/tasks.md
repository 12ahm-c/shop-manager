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
