# AI Workflow for ShopManager Pro

**Version 2.0**  
**Aligned with `docs/architecture.md` v2.0**  
**December 2025**

---

## 1. Purpose

This document defines the AI-assisted development workflow for ShopManager Pro. The workflow is strict, human-supervised, and designed to prevent hallucinated endpoints, stale architecture choices, broad refactors, and security regressions.

Default flow:

```text
Orchestrator -> Build -> Review/Security -> Human approval / PR merge
```

---

## 2. Source of Truth Hierarchy

When documents conflict, use this order:

| Rank | Document | Authority |
|------|----------|-----------|
| 1 | `docs/architecture.md` | Technical architecture, data model, business rules, security, scalability |
| 2 | `docs/API-contract.md` | REST endpoints, DTOs, events, errors, idempotency, pagination |
| 3 | `docs/master-plan.md` | Delivery sequencing, milestones, definition of done |
| 4 | `docs/backend-plan.md` | Backend ownership, implementation phases, backend checks |
| 5 | `docs/frontend-plan.md` | Frontend ownership, mocks, UI phases |
| 6 | `docs/infra-plan.md` | Deployment, environments, Redis, MongoDB, backups |

Rule: if an endpoint, field, collection, error code, event, dependency, or business rule is missing, stop and ask for a docs update instead of inventing it.

---

## 3. Architecture Guardrails

All agents must preserve architecture v2 decisions:

- Modular monolith backend with Express.
- React/Vite frontend.
- MongoDB + Mongoose.
- Redis for BullMQ, cache, rate limiting, Socket.IO adapter, and operational state.
- Unified `stock` collection for stock lots.
- Embedded `sales.items`.
- `wallet_transactions` and `logs` are append-only.
- Phone/password login scoped by `storeId`.
- JWT payload includes `{ sub, role, storeId, iat, exp }`.
- Socket.IO rooms are `store:{storeId}`, `admin:{storeId}`, `employee:{userId}`, and `ai:{userId}`.
- French/Arabic UI support.

Forbidden stale model assumptions:

- Do not use `stock_batches`.
- Do not use `stock_movements`.
- Do not use `sale_items`.
- Do not use email-only login as the primary auth contract.

---

## 4. Agent Roles

### Orchestrator

Responsibilities:

- Read relevant docs before scoping work.
- Classify task as `docs`, `backend`, `frontend`, `infra`, `contract`, `architecture`, or `critical-module`.
- Check milestone dependencies.
- Define exact scope and allowed files.
- Identify forbidden files.
- Identify cross-cutting changes: API contract, schema, environment variables, dependencies, CI/CD, scaffolding.
- Require Review/Security for critical modules.
- Summarize verification and remaining risk.

### Build

Build implements only the approved scope.

Before editing, Build must state:

- Approved task scope.
- Files to create/modify.
- Files/patterns that are out of scope.
- Whether contract/schema/env/dependency changes are required and approved.

During implementation, Build must:

- Follow `docs/API-contract.md`.
- Enforce business rules in services, not controllers.
- Use the central frontend API client.
- Keep backend business logic out of UI.
- Use MongoDB transactions for critical operations.
- Stop if the task expands beyond scope.

Build must not:

- Invent endpoints, DTO fields, events, error codes, roles, collections, or pagination rules.
- Add dependencies or environment variables without approval.
- Mix unrelated refactors with feature work.
- Store durable files on API local disk in production.
- Bypass RBAC or store isolation.

### Review/Security

Review/Security is read-only unless explicitly asked to fix.

Review checklist:

- Scope compliance.
- API contract compliance.
- Architecture v2 data model compliance.
- Auth/RBAC/store isolation.
- Idempotency on critical mutations.
- FIFO and stock integrity.
- Wallet/debt transactional integrity.
- Append-only logs and wallet transactions.
- Error handling without stack trace leakage.
- Tests or documented verification.
- Infrastructure/secrets safety.

Output:

1. Findings by severity with file/line references.
2. Open questions.
3. Residual risk summary.
4. Go / No-Go / Changes required.

---

## 5. Task Lifecycle

```text
1. Task created from user request or milestone
2. Orchestrator reads source documents
3. Orchestrator defines scope and checks dependencies
4. Build restates scope and implements
5. Build stops if docs or scope are insufficient
6. Review/Security audits changes
7. Human approves, requests changes, or merges
```

Stop conditions:

- Missing/conflicting API contract.
- Missing/conflicting architecture rule.
- Database schema/index change not approved.
- New dependency or environment variable not approved.
- Scaffolding/folder structure change not approved.
- Scope expands beyond approved files.

---

## 6. Critical Modules

The following require extra care and usually Review/Security:

- Authentication, refresh tokens, RBAC, store isolation.
- Sales pipeline.
- Stock FIFO and stock adjustments.
- Customer/supplier debt.
- Wallets and wallet transactions.
- Loyalty points.
- PDF, WhatsApp, and email workflows.
- AI tool execution and MongoDB query generation.
- Audit logs.
- Backups and restore scripts.
- Infrastructure secrets and deployment configuration.

---

## 7. Anti-Hallucination Rules

Before using any API feature:

1. Locate it in `docs/API-contract.md`.
2. If absent, treat it as unavailable.
3. Ask for a contract update.

Before using any model/field/index:

1. Locate it in `docs/architecture.md`.
2. If absent, treat it as unavailable.
3. Ask for an architecture/schema update.

Before applying any business rule:

1. Locate it in `docs/architecture.md` or `docs/master-plan.md`.
2. If ambiguous, stop and ask.

---

## 8. PR and Task Size Rules

- One PR should cover one task or feature slice.
- Contract changes should be isolated.
- Schema/index changes need rollout notes.
- Critical module PRs should be small.
- PR summary must include changed files, verification, risks, and screenshots for UI work.

---

## 9. Definition of Done for AI Tasks

A task is done when:

- The relevant source documents were consulted.
- Scope stayed within approved boundaries.
- No invented endpoints, fields, collections, events, or business rules were introduced.
- Architecture v2 terminology and data model are respected.
- Tests or practical verification were run, or the reason they could not run is documented.
- Critical module work received review where required.
- The final summary states what changed, how it was verified, and any residual risk.

---

End of AI Workflow for ShopManager Pro v2.0
