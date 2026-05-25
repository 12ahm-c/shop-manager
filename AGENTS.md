```markdown
# AGENTS.md – SHOPMANAGER PRO

**Version 1.0**  
*Governance rules for AI assistants working on this repository*  
*Effective date: December 2025*

---

## 1. Purpose

This document defines **strict boundaries** for any AI assistant (e.g., GitHub Copilot, Cursor, ChatGPT, etc.) contributing to the ShopManager Pro codebase.  
The goal is to **protect** the system’s core contracts, business rules, data integrity, and security model from unintended or unauthorized changes.

All AI‑assisted code generation, refactoring, documentation updates, and commit suggestions **MUST** comply with these rules.

---

## 2. Immutable Sources of Truth

The following documents are **canonical** and **cannot be altered by AI** without explicit human approval (see §7 – Escalation).  

| Document | Role | Key constraints |
|----------|------|----------------|
| `architecture.md` | System structure, architectural principles | Layered architecture, FIFO, transactions, multi‑wallet, debt tracking, RBAC, audit logs |
| `API-contract.md` | HTTP & WebSocket contracts | Endpoint shapes, DTOs, error codes, idempotency, pagination, Socket.IO events |
| `backend-plan.md` | Backend implementation rules | Service layer ownership, transaction requirements, FIFO enforcement, security rules |
| `frontend-plan.md` | Frontend boundaries | No business logic, mock rules, state management limits, routing protection |
| `infra-plan.md` | Infrastructure & runtime | Deployment architecture, environment separation, scaling limits, secrets handling |

Any deviation from these documents must follow the **escalation protocol** (§7).

---

## 3. Core Principles for AI

1. **Contract First** – The API contract is the sole source of truth for all client‑server communication.  
2. **Backend Authoritative** – All business rules (FIFO, stock, debts, wallets, loyalty) live in backend services, never in the frontend.  
3. **Data Integrity** – Critical operations (sales, stock receipts, payments, transfers) MUST use MongoDB transactions.  
4. **Security by Default** – RBAC, JWT validation, audit logging, and idempotency are non‑negotiable.  
5. **Observability** – Every state change must be logged (immutable `logs` collection) and emit appropriate Socket.IO events.

---

## 4. Allowed Actions (AI may perform without approval)

The following actions are **automatically allowed** as long as they respect the sources of truth and do not introduce logic changes:

### 4.1 Code generation & refactoring
- Implementing **existing** endpoints from `API-contract.md` that are not yet implemented.
- Adding **validation schemas** (Zod) that exactly mirror contract requirements.
- Creating **unit tests** or **integration tests** that validate contract compliance.
- Refactoring code for **readability** or **performance** without altering behavior.
- Adding **logging** or **monitoring** instrumentation (structured logs, metrics).

### 4.2 Documentation
- Updating inline comments or JSDoc to clarify existing logic.
- Generating or updating `README.md` sections about setup, environment variables, or local development.
- Creating example payloads or usage snippets that match the contract.

### 4.3 Frontend UI (strictly presentation)
- Building React components that consume **existing** API endpoints via the shared API client.
- Adding loading/error/empty states to screens.
- Implementing responsive layouts or accessibility improvements.
- Connecting real endpoints after mocks are approved (swap only, no contract change).

### 4.4 Infrastructure (non‑critical)
- Modifying `docker-compose.yml` for local development (adding volumes, ports).
- Updating environment variable examples (`.env.example`) with new **non‑secret** keys.
- Suggesting changes to `package.json` scripts (e.g., adding a lint fix script).

---

## 5. Forbidden Actions (AI must never do)

The following actions are **strictly forbidden** without prior human approval (escalation required):

### 5.1 Contract & schema changes
- **Adding, removing, or renaming** any field in a DTO (UserDTO, ProductDTO, SaleDTO, etc.).
- **Changing** the structure of the standard response envelope (`success`, `data`, `error`, `meta`).
- **Modifying** HTTP status codes, error codes, or idempotency requirements.
- **Altering** pagination strategy (cursor vs offset) for any endpoint.
- **Changing** Socket.IO event names or payload shapes.

### 5.2 Database & business logic
- **Modifying** Mongoose schema definitions (fields, types, indexes, references).
- **Changing** the FIFO batch selection algorithm.
- **Removing or bypassing** MongoDB transactions in critical operations.
- **Altering** loyalty points calculation or redemption rules.
- **Changing** debt aging logic (30/45/60 day thresholds) or relance rules.
- **Modifying** RBAC role definitions or permission mappings.

### 5.3 Security & compliance
- **Removing** authentication/authorization middleware from any protected route.
- **Disabling** rate limiting or audit logging.
- **Changing** JWT signing algorithms or token expiration times.
- **Hardcoding** secrets (API keys, passwords, tokens) in source code.
- **Storing** refresh tokens in localStorage or insecure cookies.

### 5.4 Infrastructure & deployment
- **Changing** production environment variables (e.g., `NODE_ENV`, `MONGODB_URI`) without infrastructure team review.
- **Modifying** Terraform, CloudFormation, or ECS task definitions.
- **Altering** backup schedules or retention policies.

### 5.5 Frontend business logic
- **Implementing** price calculations, tax logic, or loyalty point redemption on the client.
- **Storing** sensitive data (tokens, user credentials, credit card info) in Zustand or localStorage.
- **Bypassing** the API client and calling `fetch` directly without authentication headers.
- **Rendering** fields that are role‑restricted (e.g., `purchasePrice` for employee role).

---

## 6. Escalation Protocol

When an AI determines that a requested change **violates** the allowed actions or **requires modification** of an immutable source of truth, it **must**:

1. **Stop** – Do not generate code, documentation, or suggestions that implement the change.
2. **Explain** – Clearly state which rule or contract would be violated.
3. **Request approval** – Use the following template to escalate to a human maintainer:

```markdown
**ESCALATION REQUIRED** – Unauthorized change detected

- **Proposed change**: [brief description]
- **Violates**: [document name, section, and rule]
- **Impact**: [why it breaks contract / security / business logic]
- **Alternative**: [if any, e.g., "This would require updating API-contract.md first"]

Please confirm approval before proceeding.
```

4. Wait – Do not act until the human explicitly approves the change and updates the relevant source of truth.

Examples of required escalation:

· Adding a new discountCode field to POST /sales → requires contract update.
· Changing saleDate from Date to string in a DTO → contract violation.
· Removing a transaction from saleService.createSale() → violates backend‑plan integrity rule.
· Adding a new Socket.IO event for live_chat → not in Appendix B.

---

7. Safety Constraints (runtime & data)

Even within allowed actions, AI must respect these safety constraints:

7.1 Data validation

· All inputs must be validated with Zod schemas derived from the API contract.
· Never trust client‑side calculations (e.g., total amount, change, points). Backend recomputes everything.

7.2 Idempotency

· All endpoints listed in API-contract.md §1.3 must check Idempotency-Key headers.
· Duplicate keys with different bodies → return 409 IDEMPOTENCY_KEY_REUSED.

7.3 Stock & inventory

· Never allow negative stock after a sale – the FIFO selection must throw INSUFFICIENT_STOCK.
· Expired batches (expiryDate < now) must be excluded from FIFO selection automatically.

7.4 Financial transactions

· Every wallet credit/debit must create an immutable WalletTransaction document.
· Transfers between wallets must be atomic (MongoDB transaction or two‑phase commit).
· Reconciliation (lastReconciliation, closingBalance) cannot be overwritten; only appended.

7.5 Concurrency

· For high‑contention operations (sales on popular products), use optimistic locking or findOneAndUpdate with atomic $inc.
· Do not implement custom locking mechanisms unless approved.

7.6 Testing requirements

· Any change to a critical service (sales, stock, wallets, debts) must include integration tests that verify transactional rollback on error.
· Mock tests are insufficient for FIFO, idempotency, or concurrency checks.

---

8. Review & Approval Workflow

Change Type Required Reviewers Approval Needed
Bug fix within existing contract Team lead or peer ✅ (code review)
New endpoint (not in contract) Backend + Frontend + Product ✅ (contract update first)
Database index change DBA / Backend lead ✅ (performance review)
Frontend component without new logic Frontend lead ✅ (code review)
Infrastructure change (dev only) DevOps ✅ (plan review)
Infrastructure change (prod) DevOps + Security ✅ (change request)

---

9. Enforcement & Violations

· AI‑generated pull requests that violate any rule in this document will be rejected.
· Repeated violations will result in the AI assistant being disabled for this repository.
· Humans are ultimately responsible for reviewing AI contributions; use the [AI‑GENERATED] label for all AI commits.

---

10. Document Version & Updates

· This document can only be amended by the project maintainers after consensus.
· Any update to the sources of truth (architecture.md, API-contract.md, etc.) must be reflected in this AGENTS.md (e.g., updating rule references).

Current version: 1.0
Next review: March 2026

---

By contributing to this repository, you agree to follow the governance rules defined above.

```
```