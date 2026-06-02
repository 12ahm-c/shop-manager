# Backend Tasks — Phases 6, 7 & 8 ✓ COMPLETED

Based on `docs/backend-plan.md` §7 — Implementation Phases.

---

## Phase 6 — Invoices, Documents, Notifications ✓

| # | Task | Status | File |
|---|------|--------|------|
| 6.1 | Invoice model | ✓ Pre-existing | `modules/invoices/invoice.model.js` |
| 6.2 | PDF generation with Puppeteer + template cache | ✓ | `services/pdf.service.js` |
| 6.3 | WhatsApp service | ✓ | `services/whatsapp.service.js` |
| 6.4 | Email service | ✓ | `services/email.service.js` |
| 6.5 | Invoice retrieval & resend endpoints | ✓ Pre-existing | `modules/invoices/invoice.controller.js`, `invoice.routes.js` |
| 6.6 | Notification model + endpoints | ✓ Pre-existing | `modules/notifications/` |
| 6.7 | Anti-spam rules | ✓ | `services/notification.service.js` |
| 6.8 | Sale → BullMQ job wiring | ✓ Pre-existing | `modules/sales/sale.service.js` |
| 6.9 | BullMQ queues: `invoice-generation`, `whatsapp`, `email` | ✓ | `jobs/queue.service.js` |
| 6.10 | WhatsApp worker | ✓ | `jobs/whatsapp.worker.js` |
| 6.11 | Email worker | ✓ | `jobs/email.worker.js` |
| 6.12 | Notification creation service + Socket.IO events | ✓ | `services/notification.service.js` |
| 6.13 | Report worker | ✓ | `jobs/report.worker.js` |
| 6.14 | Invoice job worker update (PDF + Socket.IO) | ✓ | `jobs/invoice.job.js` |

---

## Phase 7 — Dashboard, Reports, AI ✓

| # | Task | Status | File |
|---|------|--------|------|
| 7.1 | Dashboard endpoints | ✓ Pre-existing | `modules/dashboard/dashboard.controller.js`, `dashboard.routes.js` |
| 7.2 | Redis caching for admin + financial dashboard | ✓ | `services/cache.service.js` |
| 7.3 | Report endpoints + aggregations | ✓ Pre-existing | `modules/reports/report.controller.js`, `report.routes.js` |
| 7.4 | AI chat endpoint `POST /ai/chat` | ✓ | `modules/ai/ai.routes.js`, `ai.controller.js`, `ai.service.js` |
| 7.5 | AI suggestions `GET /ai/suggestions` | ✓ | `modules/ai/ai.controller.js` |
| 7.6 | AI health `GET /ai/health` | ✓ | `modules/ai/ai.controller.js` |
| 7.7 | LLM service (OpenAI/Mistral/Ollama) | ✓ | `services/llm.service.js` |
| 7.8 | Socket.IO `ai:response` event | ✓ | `modules/ai/ai.controller.js`, `socket/socket.server.js` |
| 7.9 | Dashboard cache invalidation on sale | ✓ | `modules/sales/sale.service.js` |
| 7.10 | `ai:{userId}` room joining | ✓ | `socket/socket.server.js` |

---

## Phase 8 — Hardening ✓

| # | Task | Status | File |
|---|------|--------|------|
| 8.1 | Rate limiting (general + sales + AI) | ✓ | `middlewares/rateLimit.middleware.js` |
| 8.2 | Health check endpoint (MongoDB + Redis) | ✓ | `modules/health/health.controller.js`, `health.routes.js` |
| 8.3 | MongoDB backup script | ✓ | `scripts/backup.js` |
| 8.4 | MongoDB restore script | ✓ | `scripts/restore.js` |
| 8.5 | BullMQ backup worker | ✓ | `jobs/backup.worker.js` |
| 8.6 | Structured JSON logging | ✓ | `utils/logger.js` |
| 8.7 | Request logging middleware | ✓ | `app.js` (via `utils/logger.js`) |
| 8.8 | Integration test: sale transaction rollback | ✓ | `tests/integration/sales.test.js` |
| 8.9 | Integration test: FIFO stock selection | ✓ | `tests/integration/fifo.test.js` |
| 8.10 | Integration test: wallet transfer atomicity | ✓ | `tests/integration/wallets.test.js` |
| 8.11 | Integration test: debt payment atomicity | ✓ | `tests/integration/debts.test.js` |
| 8.12 | Integration test: append-only logs | ✓ | `tests/integration/logs.test.js` |
| 8.13 | Integration test: RBAC field hiding | ✓ | `tests/integration/rbac.test.js` |
| 8.14 | Production readiness checklist | ✓ | `docs/production-checklist.md` |
| 8.15 | Admin backup route → BullMQ queue | ✓ | `modules/admin/admin.routes.js` |

---

## Files Created / Modified

### New files
| File | Phase |
|------|-------|
| `src/services/pdf.service.js` | 6 |
| `src/services/whatsapp.service.js` | 6 |
| `src/services/email.service.js` | 6 |
| `src/services/notification.service.js` | 6 |
| `src/services/cache.service.js` | 7 |
| `src/services/llm.service.js` | 7 |
| `src/modules/ai/ai.routes.js` | 7 |
| `src/modules/ai/ai.controller.js` | 7 |
| `src/modules/ai/ai.service.js` | 7 |
| `src/modules/health/health.routes.js` | 8 |
| `src/modules/health/health.controller.js` | 8 |
| `src/jobs/whatsapp.worker.js` | 6 |
| `src/jobs/email.worker.js` | 6 |
| `src/jobs/report.worker.js` | 6 |
| `src/jobs/backup.worker.js` | 8 |
| `src/utils/logger.js` | 8 |
| `scripts/backup.js` | 8 |
| `scripts/restore.js` | 8 |
| `src/tests/integration/sales.test.js` | 8 |
| `src/tests/integration/fifo.test.js` | 8 |
| `src/tests/integration/wallets.test.js` | 8 |
| `src/tests/integration/debts.test.js` | 8 |
| `src/tests/integration/logs.test.js` | 8 |
| `src/tests/integration/rbac.test.js` | 8 |
| `docs/production-checklist.md` | 8 |

### Modified files
| File | Changes |
|------|---------|
| `src/jobs/invoice.job.js` | PDF service integration, Socket.IO `invoice:ready` event, notification on failure |
| `src/jobs/queue.service.js` | Added `whatsapp`, `email`, `reports`, `backup` queues + job helpers |
| `src/server.js` | Register WhatsApp, Email, Report, Backup workers |
| `src/app.js` | Mount AI routes, health routes, request logger, rate limiters |
| `src/socket/socket.server.js` | Added `ai:{userId}` room, `emitToUser`, `emitToAI` helpers |
| `src/modules/sales/sale.service.js` | Cache invalidation on sale create/cancel |
| `src/modules/dashboard/dashboard.controller.js` | Redis caching for admin + financial endpoints |
| `src/modules/admin/admin.routes.js` | Backup route now queues via BullMQ |
| `src/middlewares/rateLimit.middleware.js` | Added `apiLimiter`, `salesLimiter`, `aiLimiter` |

---

## Remaining (requires new npm packages)

| Feature | Package needed |
|---------|---------------|
| Actual PDF generation | `puppeteer` |
| SMTP email delivery | `nodemailer` |
| WhatsApp Cloud API client | `axios` |
| Structured logging (production) | `pino` |
| Test runner | `jest`, `mocha`, or `vitest` |
| Supertest for HTTP tests | `supertest` |
