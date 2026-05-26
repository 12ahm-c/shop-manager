# Phase 1 - Backend Auth, Stores, Users, and Employees Tasks

Based on `docs/backend-plan.md` v2.0, `docs/architecture.md` v2.0, and `docs/API-contract.md` v2.0.

---

## 1. Project & Environment Setup
- `[x]` Install backend dependencies in `apps/backend/package.json`:
  - `mongoose` (MongoDB ODM)
  - `zod` (Request validation)
  - `bcrypt` (Password hashing)
  - `jsonwebtoken` (Access and refresh token handling)
  - `express-rate-limit` (Login rate limiting)
- `[x]` Install development dependencies:
  - `nodemon` (Auto-restart dev server)
  - `jest` & `supertest` & `mongodb-memory-server` (Testing suite)
- `[x]` Setup `.env` configuration file in `apps/backend/` containing:
  - `PORT=3001`
  - `MONGODB_URI=mongodb+srv://Ahmed:Aa41221833@cluster0.nuezeew.mongodb.net/shop-manager`
  - `JWT_SECRET` (For access tokens)
  - `JWT_REFRESH_SECRET` (For refresh tokens)
- `[x]` Establish Mongoose connection helper (`src/config/database.js`) with appropriate connection pool settings.
- `[x]` Bootstrap Express application (`src/app.js` and `src/server.js`) with JSON parsing, CORS, and centralized error handling middleware.

## 2. Database Models & Indexes (Architecture v2)
- `[x]` Implement **Store Model** (`src/modules/stores/store.model.js`):
  - Fields: `name`, `logo`, `address`, `phone`, `email`, `taxId`, `currency`, `isActive`, `createdAt`.
  - Nested `settings` object containing: `loyaltyPointsPer100`, `loyaltyRedeemRate`, `invoiceNextNumber`, `vatRate`, `lowStockThresholdPercent`.
- `[x]` Implement **User Model** (`src/modules/users/user.model.js`):
  - Fields: `storeId` (ref Store), `name`, `phone` (unique), `passwordHash`, `role` (enum: `'admin'`, `'employee'`, `'accountant'`), `isActive`, `permissions` (array of strings), `lastLogin`, `refreshTokenHash` (for revocation/rotation), `createdAt`.
  - Add bcrypt password hashing hook (`pre('save')`) and password comparison method (`comparePassword`).
- `[x]` Implement **Employee Model** (`src/modules/employees/employee.model.js`):
  - Fields: `storeId` (ref Store), `userId` (ref User, optional), `employeeNumber` (unique string), `position`, `hireDate`, `salary`, `commissionRate`, `emergencyContact` (`name`, `phone`), `documents` (array of `{ name, url }`), `isActive`, `createdAt`, `updatedAt`.
- `[x]` Implement **Logs Model** (`src/modules/admin/log.model.js`):
  - Fields: `storeId`, `userId` (ref User), `action` (enum: `'login'`, `'logout'`, etc.), `entity` (string, e.g. `'User'`), `entityId` (ObjectId), `details` (Object), `ip`, `userAgent`, `timestamp`.
  - Ensure the model is **append-only** (restrict update/delete operations at application level).
  - Add indexes: `{ storeId: 1, timestamp: -1 }`.

## 3. Middlewares & Security Guardrails
- `[x]` Implement **Authentication Middleware** (`src/middlewares/auth.middleware.js`):
  - Extract Bearer token from `Authorization` header.
  - Verify JWT and decode payload: `{ sub, role, storeId, iat, exp }`.
  - Attach user context to `req.user`.
  - Handle token expiration and invalid token errors matching standard response envelopes (`TOKEN_EXPIRED`, `TOKEN_INVALID`).
- `[x]` Implement **RBAC Middleware** (`src/middlewares/rbac.middleware.js`):
  - Helper function `requireRole(...roles)` to restrict route access.
  - Verify `req.user.role` is included in approved roles; return `FORBIDDEN` (`403`) if unauthorized.
- `[x]` Implement **Store Isolation Middleware** (`src/middlewares/storeIsolation.middleware.js` or query hook):
  - Intercept queries/requests to ensure all reads/writes filter by `req.user.storeId`.
  - Prevent cross-tenant data leakage by enforcing `storeId` scoping.
- `[x]` Implement **Rate Limiting Middleware** (`src/middlewares/rateLimit.middleware.js`):
  - Apply login rate limiter (`max: 5` attempts per 15 minutes) to `POST /auth/login` to prevent brute force.

## 4. Authentication & Profile Endpoints
*All responses must strictly adhere to the standard envelope `{ success, data, error, meta }`.*
- `[x]` **`POST /auth/login`** (Public):
  - Validate body schema (`phone`, `password`, `storeId`) with Zod.
  - Find active user with matching phone and `storeId`.
  - Verify password hash.
  - Generate JWT access token (short life, e.g. 15 mins) and refresh token (longer life, e.g. 7 days).
  - Store hash of refresh token in `User.refreshTokenHash` for rotation and revocation.
  - Update `lastLogin` timestamp.
  - Append audit log entry for `'login'`.
  - Return `{ accessToken, refreshToken, user, store }`.
- `[x]` **`POST /auth/refresh`** (Public):
  - Validate body schema (`refreshToken`) with Zod.
  - Verify refresh token using refresh secret.
  - Find user, verify refresh token matches stored `refreshTokenHash`.
  - Generate new access token and rotated refresh token.
  - Update `refreshTokenHash` in database (rotation).
  - Return new `{ accessToken, refreshToken }`.
- `[x]` **`POST /auth/logout`** (Authenticated):
  - Revoke refresh token by clearing `refreshTokenHash` on current user.
  - Append audit log entry for `'logout'`.
  - Return `200` success envelope.
- `[x]` **`GET /auth/me`** (Authenticated):
  - Return current user details, associated store info, and system permissions.
- `[x]` **`GET /users/me`** (Authenticated):
  - Return profile details of the current logged-in user.
- `[x]` **`PATCH /users/me`** (Authenticated):
  - Validate updates (`name`, `phone`, etc.) with Zod.
  - Update user document and return updated user object.

## 5. Employee Management Endpoints
- `[x]` **`GET /admin/employees`** (Admin only):
  - Retrieve list of employee documents linked to the admin's `storeId` (Store isolation).
  - Support offset-based pagination (`page`, `limit`).
- `[x]` **`POST /admin/employees`** (Admin only):
  - Validate body schema (employee info, user info) with Zod.
  - Use a MongoDB transaction (session) to create:
    1. User document (with role/credentials).
    2. Linked Employee document.
  - Return created employee details inside success envelope.
- `[x]` **`PATCH /admin/employees/:id`** (Admin only):
  - Validate updates with Zod.
  - Update employee details and optionally linked user details (role, status, position) inside a transaction.

## 6. Centralized Error & Response Formatting
- `[x]` Create API response helper (`src/utils/apiResponse.js`) to format standard envelopes (`{ success, data, error, meta }`).
- `[x]` Implement Centralized Error Handler Middleware (`src/middlewares/error.middleware.js`):
  - Catch all uncaught exceptions.
  - Return structured JSON response with appropriate HTTP status codes and error codes (`VALIDATION_ERROR`, `FORBIDDEN`, `AUTH_REQUIRED`, `NOT_FOUND`, etc.).
  - Ensure stack traces are hidden in production environment.

## 7. Quality Assurance & Tests
- `[x]` Setup integration test suite for authentication flow:
  - Test login with valid/invalid credentials.
  - Test JWT verification and token expiration handling.
  - Test refresh token rotation (re-using old refresh token must fail).
  - Test refresh token revocation (logout).
- `[x]` Setup integration test suite for authorization and isolation:
  - Test that `employee` role cannot query `/admin/*` endpoints.
  - Test that store isolation filters queries correctly (create test data for Store A and Store B, verify Store B user cannot access Store A records).
- `[x]` Setup integration test suite for transactions & audit logs:
  - Test employee creation creates both user and employee documents or rolls back on error.
  - Verify login and logout events append records to the `logs` collection.
