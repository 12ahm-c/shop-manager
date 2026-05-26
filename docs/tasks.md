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
