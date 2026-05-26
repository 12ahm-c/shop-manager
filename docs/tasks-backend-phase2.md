# Phase 2 - Backend Products and Unified Stock Tasks

Based on `docs/backend-plan.md` v2.0, `docs/architecture.md` v2.0, and `docs/API-contract.md` v2.0.

---

## 1. Database Models & Indexes
- `[ ]` Implement **Product Model** (`src/modules/products/product.model.js`):
  - Fields:
    - `storeId` (ref Store, required)
    - `name` (String, required)
    - `dci` (String, optional)
    - `barcode` (String, optional, unique sparse)
    - `category` (String, required)
    - `sellPrice` (Number, required)
    - `purchasePrice` (Number, required, representing Weighted Average Price)
    - `minStock` (Number, default: 0)
    - `unit` (String, default: 'pcs')
    - `requiresPrescription` (Boolean, default: false)
    - `isActive` (Boolean, default: true)
    - `imageUrl` (String, optional)
  - Timestamps: `createdAt`, `updatedAt`.
  - Indexes:
    - Compound index: `{ storeId: 1, barcode: 1 }` (unique if barcode is present)
    - Text index: `{ name: "text", dci: "text", barcode: "text" }` for search
    - Compound index: `{ storeId: 1, name: 1 }`

- `[ ]` Implement **Stock Model** (`src/modules/stock/stock.model.js`):
  - Fields:
    - `storeId` (ref Store, required)
    - `productId` (ref Product, required)
    - `quantity` (Number, required, must be >= 0)
    - `lotNumber` (String, optional)
    - `purchasePrice` (Number, required, specific lot cost)
    - `expiryDate` (Date, optional)
    - `receptionDate` (Date, default: Date.now)
    - `supplierId` (ref Supplier, required)
    - `isActive` (Boolean, default: true)
  - Timestamps: `createdAt`, `updatedAt`.
  - Indexes:
    - Compound index: `{ productId: 1, receptionDate: 1 }` (for FIFO sorting)
    - Compound index: `{ storeId: 1, productId: 1, isActive: 1 }`

---

## 2. Product CRUD & Search Endpoints
- `[ ]` **`POST /products`** (Admin only):
  - Zod body validation (`name`, `category`, `sellPrice`, `purchasePrice`, `barcode`, etc.).
  - Check barcode uniqueness per store. Return `409 DUPLICATE_BARCODE` if barcode already exists.
  - Save product document scoped to `req.user.storeId`.
  - Return created product inside success envelope.

- `[ ]` **`GET /products/search`** (Employee/Admin):
  - Handle query parameter `q` (search term).
  - Scoped strictly to `req.user.storeId` (Store isolation).
  - Support text search using the text index or regex fallback on name/barcode/dci.
  - Implement offset-based pagination (`page`, `limit`).
  - Return paginated products array.

- `[ ]` **`GET /products/:id`** (Employee/Admin):
  - Retrieve product by ID (must belong to `req.user.storeId`).
  - Perform aggregation on the `stock` collection to compute `totalStock` (sum of `quantity` of all active, non-expired stock lots).
  - **Role-based field restriction**:
    - If `req.user.role === 'employee'`, strip out sensitive cost fields (`purchasePrice`) from the product object in the response.
  - Return `{ product, totalStock }` inside success envelope.

- `[ ]` **`PUT /products/:id`** (Admin only):
  - Zod body validation.
  - Verify product belongs to `req.user.storeId`.
  - Check barcode uniqueness if changed.
  - Update product and return updated document.

- `[ ]` **`DELETE /products/:id`** (Admin only):
  - Soft delete product by setting `isActive = false`.
  - Optionally mark corresponding active stock lots as inactive (`isActive = false`) or let them remain.

- `[ ]` **`POST /products/import`** (Admin only):
  - Accept uploaded CSV/Excel product data.
  - Validate each row schema with Zod.
  - Resolve duplicates according to standard strategy (e.g., skip or update based on barcode).
  - Use a MongoDB transaction to perform batch inserts/updates safely.

---

## 3. Stock Operations & Inventory Endpoints
- `[ ]` **`POST /stock/receive`** (Admin only, requires `Idempotency-Key`):
  - Zod body validation:
    - `supplierId` (ref Supplier, required)
    - `items` array: `[ { productId, quantity, purchasePrice, lotNumber, expiryDate } ]`
  - Implement idempotency key check.
  - Execute within a **MongoDB transaction (session)**:
    1. Validate that all products exist and belong to the store.
    2. Create a new `stock` document for each item.
    3. Update `Product.purchasePrice` (Weighted Average Price / WAP) for each product:
       - `new_WAP = ((current_stock * current_WAP) + (received_qty * received_cost)) / (current_stock + received_qty)`
       - If current stock is negative or zero, new WAP equals the received lot purchase price.
    4. Fetch the Supplier document and increment `supplier.currentDebt` by the sum of `quantity * purchasePrice` for all items.
    5. Append audit log entry for `'stock_receipt'`.
  - Return success envelope with created stock lots.

- `[ ]` **`POST /stock/adjust`** (Admin only, requires `Idempotency-Key`):
  - Zod body validation:
    - `productId` (required)
    - `lotId` (optional, to adjust a specific lot)
    - `quantity` (number, can be positive/negative adjustment, or set)
    - `type` (enum: `'increment'`, `'decrement'`, `'set'`)
    - `reason` (string, required)
  - Implement idempotency key check.
  - Execute within a **MongoDB transaction**:
    1. Retrieve the product and corresponding active stock lot(s).
    2. Apply adjustment to the specified lot (or newest lot if `lotId` is omitted).
    3. Ensure lot quantity does not become negative (throw `INSUFFICIENT_STOCK` if it does).
    4. Recalculate `Product.purchasePrice` (WAP) if the total quantity changes.
    5. Append audit log entry for `'stock_adjust'`.
  - Return success envelope with adjusted lot details.

- `[ ]` **`GET /stock/:productId`** (Employee/Admin):
  - Retrieve active stock lots for the given product ID.
  - Scoped to `req.user.storeId` and filter where `isActive = true` and `quantity > 0`.
  - Sort by `receptionDate: 1` (FIFO order).
  - **Role-based field restriction**:
    - If `req.user.role === 'employee'`, strip out cost fields (`purchasePrice`) from the response stock lots.
  - Return array of stock lots.

- `[ ]` **`POST /stock/transfer`** (Admin only):
  - Zod body validation:
    - `productId` (required)
    - `toStoreId` (target store ID, required)
    - `quantity` (positive number, required)
  - Execute within a **MongoDB transaction**:
    1. Select active stock lots in the source store ordered by `receptionDate` (FIFO).
    2. Decrement quantity from the selected lots (ensure total available is sufficient, otherwise throw `INSUFFICIENT_STOCK`).
    3. Create corresponding stock lots in the target store under `toStoreId` with the same `purchasePrice`, `lotNumber`, and `expiryDate`.
    4. Recalculate WAP for the product in both the source store and target store.
    5. Append audit log entries for both stores.
  - Return success envelope.

---

## 4. Quality Assurance & Integration Tests
- `[ ]` **Product CRUD & Search Tests**:
  - Test product creation succeeds and checks barcode uniqueness.
  - Test employee can search products but receives responses with `purchasePrice` stripped out.
  - Test admin search and detail responses include `purchasePrice`.
  - Test soft delete sets `isActive` to false.

- `[ ]` **Stock Receipt & WAP Recalculation Tests**:
  - Test stock receipt creates stock lot documents.
  - Test that receiving stock recalculates `Product.purchasePrice` correctly according to the Weighted Average Price formula.
  - Test supplier debt increments atomically by the total purchase cost.
  - Test transaction rollback: if supplier update fails or a product is invalid, no stock lots are created and WAP is not altered.

- `[ ]` **Stock Adjustment & Transfer Tests**:
  - Test incrementing, decrementing, and setting stock quantities.
  - Test that adjusting stock below zero fails with `INSUFFICIENT_STOCK`.
  - Test stock transfer decrements source store lots (FIFO order) and creates target store lots.
  - Test store isolation: verify a user from Store A cannot view or manipulate stock in Store B.

- `[ ]` **Idempotency Key Tests**:
  - Verify that submitting duplicate requests with the same `Idempotency-Key` to `/stock/receive` and `/stock/adjust` returns the cached response without repeating the database side effects.
  - Verify that sending a different request body with a reused key returns `409 IDEMPOTENCY_KEY_REUSED`.
