# SHOPMANAGER PRO - API Contract

**Version 2.0**  
**Aligned with `docs/architecture.md` v2.0**  
**December 2025**

This contract defines the REST and Socket.IO surface between the React/Vite frontend and the Node.js/Express backend. The architecture document remains the business and data-model source of truth; this file makes that architecture executable for frontend/backend integration.

---

## 1. Global Conventions

### Base URLs

```text
Production: https://api.shopmanager.com/v1
Staging:    https://staging-api.shopmanager.com/v1
Local:      http://localhost:3001/v1
Socket.IO:  same host as API, path /socket.io
```

### Standard Response Envelope

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "nextCursor": null,
    "hasMore": false
  }
}
```

Errors use the same envelope with `success: false`, `data: null`, and:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Description lisible",
  "fields": {
    "phone": "Required"
  }
}
```

### Authentication

All endpoints require `Authorization: Bearer <accessToken>` except public auth endpoints.

Access token payload:

```json
{
  "sub": "userId",
  "role": "employee",
  "storeId": "storeId",
  "iat": 1765880000,
  "exp": 1765880900
}
```

Roles:

```text
employee | admin | accountant
```

### Idempotency

The following mutation endpoints require `Idempotency-Key: <uuid-v4>`:

- `POST /sales`
- `POST /stock/receive`
- `POST /stock/adjust`
- `POST /customers/:id/debt/pay`
- `POST /suppliers/:id/pay`
- `POST /wallets/transfer`

Same key and same payload returns the original response for 24 hours. Same key with a different payload returns `409 IDEMPOTENCY_KEY_REUSED`.

### Pagination

Offset pagination is the default:

```text
?page=1&limit=20
```

Cursor pagination is used for append-only/high-volume feeds:

```text
?cursor=<lastId>&limit=20
```

Cursor endpoints include `meta.nextCursor` and `meta.hasMore`.

### Common Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `AUTH_REQUIRED` | 401 | Missing authentication |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `TOKEN_INVALID` | 401 | Invalid/revoked token |
| `FORBIDDEN` | 403 | Role is not allowed |
| `VALIDATION_ERROR` | 400 | Request failed validation |
| `NOT_FOUND` | 404 | Resource does not exist |
| `DUPLICATE_BARCODE` | 409 | Product barcode already exists |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Same key used with different payload |
| `INVALID_STATE` | 409 | Invalid business transition |
| `INSUFFICIENT_STOCK` | 422 | Requested quantity exceeds available stock |
| `CREDIT_LIMIT_EXCEEDED` | 422 | Customer credit limit exceeded |
| `RATE_LIMITED` | 429 | Too many requests |
| `PDF_GENERATION_FAILED` | 502 | PDF worker failed |
| `WHATSAPP_ERROR` | 502 | WhatsApp send failed |
| `EMAIL_ERROR` | 502 | Email send failed |
| `LLM_ERROR` | 502 | AI provider failed |

---

## 2. Auth

### `POST /auth/login` - Public

Phone/password authentication scoped to a store.

```json
{
  "phone": "+22236123456",
  "password": "string",
  "storeId": "65f2a1b3c4d5e6f7a8b9c0d1"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt",
    "user": { "_id": "65f...", "role": "admin" },
    "store": { "_id": "65f...", "name": "Magasin Central" }
  },
  "error": null,
  "meta": null
}
```

### Other Auth Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/refresh` | public | Rotate refresh token and issue new access token |
| `POST` | `/auth/logout` | authenticated | Revoke current refresh token |
| `GET` | `/auth/me` | authenticated | Current user, store, and permissions |
| `GET` | `/users/me` | authenticated | Alias for user profile |
| `PATCH` | `/users/me` | authenticated | Update own profile |

---

## 3. Admin, Users, Stores, Employees

The architecture keeps login accounts in `users` and staff HR/profile records in `employees`.

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/admin/employees` | admin | List employee records with linked users |
| `POST` | `/admin/employees` | admin | Create employee + user account |
| `PATCH` | `/admin/employees/:id` | admin | Update employee/user status, role, position |
| `GET` | `/admin/stores` | admin | Multi-store administration where enabled |
| `GET` | `/admin/logs` | admin/accountant | Append-only audit logs, cursor paginated |
| `GET` | `/admin/settings` | admin | Store settings |
| `PUT` | `/admin/settings` | admin | Update settings |
| `POST` | `/admin/backup` | admin | Trigger manual backup job |

---

## 4. Products

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/products` | admin | Create product |
| `GET` | `/products/search?q=` | employee/admin | Search by name/barcode/category |
| `GET` | `/products/:id` | employee/admin | Product detail with aggregated stock |
| `PUT` | `/products/:id` | admin | Update product |
| `DELETE` | `/products/:id` | admin | Soft delete (`isActive=false`) |
| `POST` | `/products/import` | admin | CSV/Excel import |

Product detail response includes totals computed from the unified `stock` collection:

```json
{
  "success": true,
  "data": {
    "product": { "_id": "65f...", "name": "T-shirt blanc" },
    "totalStock": 45
  },
  "error": null,
  "meta": null
}
```

---

## 5. Stock

Architecture v2 uses a single `stock` collection. Each document is a store/product lot with `quantity`, optional `lotNumber`, `purchasePrice`, `receptionDate`, `supplierId`, and `isActive`. There are no separate `stock_batches` or `stock_movements` collections.

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/stock/receive` | admin | Create stock lot documents from supplier receipt |
| `POST` | `/stock/adjust` | admin | Manual adjustment on a stock lot/product |
| `GET` | `/stock/:productId` | employee/admin | Active stock lots for a product |
| `POST` | `/stock/transfer` | admin | Transfer stock between stores |

`POST /stock/receive` request:

```json
{
  "supplierId": "65f...",
  "items": [
    {
      "productId": "65f...",
      "quantity": 100,
      "purchasePrice": 1200,
      "lotNumber": "LOT-2026-001"
    }
  ]
}
```

FIFO is implemented by selecting `stock` documents ordered by `receptionDate`.

---

## 6. Sales

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/sales` | employee/admin | Create sale transaction |
| `GET` | `/sales/me/daily` | employee/admin | Current cashier daily summary |
| `GET` | `/sales/me/history` | employee/admin | Current cashier sale history |
| `GET` | `/sales/:id` | employee/admin | Sale detail with embedded items and invoice |
| `GET` | `/sales` | admin/accountant | Store sales with filters |
| `POST` | `/sales/:id/cancel` | admin | Cancel sale and reverse effects |

`POST /sales` request:

```json
{
  "items": [
    { "productId": "65f...", "quantity": 2 }
  ],
  "customerId": "65f...",
  "paymentMethod": "cash",
  "walletId": "65f...",
  "cashGiven": 5000,
  "useLoyaltyPoints": 50
}
```

Response:

```json
{
  "success": true,
  "data": {
    "saleId": "65f...",
    "invoiceNumber": "FAC-2025-00123",
    "totalAmount": 3800,
    "changeAmount": 1200,
    "loyaltyPointsEarned": 38,
    "newDebt": 0
  },
  "error": null,
  "meta": null
}
```

Transactional side effects:

- Create `sales` document with embedded `items`.
- Decrement selected `stock` documents using FIFO.
- Update wallet balance or customer debt.
- Update loyalty points.
- Queue PDF/WhatsApp/email jobs with BullMQ.
- Emit `sale:new` and `dashboard:update`.
- Create stock/debt notifications where needed.

---

## 7. Customers, Loyalty, Debts

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/customers` | employee/admin | Create customer |
| `GET` | `/customers/search?q=` | employee/admin | Search by phone/name |
| `GET` | `/customers/:id` | employee/admin | Customer profile, debt, loyalty, purchases |
| `POST` | `/customers/:id/debt/pay` | employee/admin | Record debt payment |
| `GET` | `/customers/debt/overdue` | admin | Customers with debt older than 30 days |
| `POST` | `/customers/:id/loyalty/redeem` | employee/admin | Preview/apply point redemption |

---

## 8. Suppliers

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/suppliers` | admin | Create supplier |
| `GET` | `/suppliers` | admin | List suppliers |
| `GET` | `/suppliers/:id/debt` | admin/accountant | Supplier debt |
| `POST` | `/suppliers/:id/pay` | admin | Pay supplier debt from wallet |

Supplier debt increases on `POST /stock/receive`.

---

## 9. Wallets

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/wallets` | admin | Create wallet |
| `GET` | `/wallets` | admin/accountant | List wallets |
| `POST` | `/wallets/transfer` | admin | Transfer money between wallets |
| `GET` | `/wallets/:id/transactions` | admin/accountant | Cursor-paginated immutable transactions |
| `POST` | `/wallets/:id/reconcile` | accountant | Record reconciliation date |

`WalletTransaction` is append-only. Wallet balance updates and transaction insertion happen in the same MongoDB transaction.

---

## 10. Invoices, Documents, Reports

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/invoices/:id` | employee/admin/accountant | Get signed PDF URL |
| `GET` | `/invoices/sale/:saleId` | employee/admin/accountant | Invoice for sale |
| `POST` | `/invoices/:id/resend` | employee/admin | Requeue WhatsApp/email send |
| `GET` | `/reports/daily-cash` | admin/accountant | PDF/XLSX daily cash report |
| `GET` | `/reports/profitability` | admin/accountant | Margin report |
| `GET` | `/reports/top-products` | admin/accountant | Top products report |
| `GET` | `/reports/aging` | admin/accountant | Customer/supplier debt aging |

PDF generation uses Puppeteer and BullMQ. XLSX generation uses ExcelJS.

---

## 11. Dashboard

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/dashboard/employee` | employee/admin | Cashier KPIs |
| `GET` | `/dashboard/admin?period=` | admin | Store KPIs, stock, margin, debts |
| `GET` | `/dashboard/financial` | accountant/admin | Financial KPIs |

Admin dashboard values may be cached in Redis for up to 5 minutes and invalidated after sales.

---

## 12. AI Assistant

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/ai/chat` | employee/admin | Natural-language question |
| `GET` | `/ai/suggestions` | employee/admin | Suggested prompts |
| `GET` | `/ai/health` | admin | LLM provider health |

The AI service always filters by `storeId` and applies RBAC before generating/executing MongoDB aggregations. Employees cannot access sensitive financial answers.

---

## 13. Notifications

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/notifications/me` | employee/admin/accountant | Own notifications |
| `PATCH` | `/notifications/:id/read` | owner/admin | Mark one notification read |
| `PATCH` | `/notifications/read-all` | authenticated | Mark all own notifications read |
| `GET` | `/admin/alerts` | admin | System alerts |

Notification types:

```text
stock_critical | out_of_stock | debt_overdue | low_wallet | whatsapp_failed
```

---

## 14. Shared DTOs

### `StockDTO`

```json
{
  "_id": "65f...",
  "storeId": "65f...",
  "productId": "65f...",
  "quantity": 50,
  "lotNumber": "LOT-2026-001",
  "purchasePrice": 1200,
  "receptionDate": "2025-12-01T09:00:00.000Z",
  "supplierId": "65f...",
  "isActive": true
}
```

### `SaleDTO`

```json
{
  "_id": "65f...",
  "storeId": "65f...",
  "cashierId": "65f...",
  "customerId": "65f...",
  "totalAmount": 3800,
  "discount": 0,
  "paymentMethod": "cash",
  "walletId": "65f...",
  "isCredit": false,
  "debtAmount": 0,
  "status": "completed",
  "saleDate": "2025-12-16T14:32:11.000Z",
  "items": [
    {
      "productId": "65f...",
      "stockId": "65f...",
      "quantity": 2,
      "unitPrice": 1900,
      "purchasePrice": 1200,
      "subtotal": 3800,
      "profit": 1400
    }
  ]
}
```

Employee-facing responses must hide `purchasePrice` and `profit` unless the role is allowed.

---

## 15. Socket.IO

### Connection

```javascript
const socket = io("https://api.shopmanager.com", {
  auth: { token: accessToken },
  query: { storeId }
});
```

Server joins authenticated sockets to:

```text
store:{storeId}
admin:{storeId}
employee:{userId}
ai:{userId}
```

### Server Events

| Event | Audience | Purpose |
|-------|----------|---------|
| `sale:new` | `admin:{storeId}` | New sale notification |
| `dashboard:update` | `admin:{storeId}` | Dashboard refresh |
| `alert:stock_critical` | store/admin | Stock at or below threshold |
| `alert:out_of_stock` | store/admin | Product unavailable |
| `alert:debt_overdue` | admin | Customer debt reminder |
| `alert:low_wallet` | admin/accountant | Wallet below minimum |
| `ai:response` | `ai:{userId}` | AI response/stream update |

Client writes are performed through REST. Socket.IO is used for realtime delivery only.

---

End of API Contract - SHOPMANAGER PRO v2.0
