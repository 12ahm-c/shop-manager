# SHOPMANAGER PRO - Infrastructure Plan

**Version 2.0**  
**Aligned with `docs/architecture.md` v2.0**  
**Production-ready and scalable infrastructure**

---

## 1. Overview

ShopManager Pro is a universal retail management SaaS built as:

- React + Vite frontend.
- Node.js/Express modular monolith.
- MongoDB with ACID transactions.
- Redis for cache, BullMQ, rate limiting, and Socket.IO adapter.
- BullMQ workers for PDF, WhatsApp, email, reports, AI, and backup work.
- Socket.IO for realtime alerts, dashboards, and AI responses.
- Object storage for invoices, reports, and backups.

The architecture supports dev, staging, production, and future on-premise deployments.

---

## 2. Infrastructure Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | S3 + CloudFront, Vercel, or Netlify | Static React/Vite build |
| API compute | Docker + ECS Fargate or VPS | Stateless Express API + Socket.IO |
| Worker compute | Docker + ECS Fargate or process manager | BullMQ workers and cron jobs |
| Database | MongoDB Atlas | Stores, users, employees, products, unified stock, sales, wallets, logs |
| Redis | Upstash or ElastiCache | Cache, queue backend, rate limits, Socket.IO pub/sub |
| Object storage | S3-compatible storage | PDF invoices, Excel reports, backups |
| Load balancer | ALB/Nginx | HTTPS, WebSocket upgrade, routing |
| Secrets | AWS Secrets Manager / Parameter Store / vault | API and provider secrets |
| Monitoring | CloudWatch, Datadog, Grafana, or equivalent | Logs, metrics, alerts |
| CI/CD | GitHub Actions or GitLab CI | Build, test, deploy |

---

## 3. Runtime Topology

```text
Browser
  -> CDN / frontend static assets
  -> HTTPS /v1/* -> API service
  -> WebSocket /socket.io -> API service

API service
  -> MongoDB Atlas
  -> Redis
  -> BullMQ queues
  -> Object storage
  -> WhatsApp / email / LLM providers

Worker service
  -> Redis queues
  -> MongoDB Atlas
  -> Object storage
  -> WhatsApp / email / LLM providers
```

API instances are stateless. Horizontal scaling requires Redis-backed Socket.IO adapter and shared BullMQ queues.

---

## 4. Environments

| Environment | API | MongoDB | Redis | Frontend | Notes |
|-------------|-----|---------|-------|----------|-------|
| dev | local `:3001` | local or Atlas M0 | local or Upstash free | Vite `:5173` | Local development |
| staging | 1-2 API tasks | Atlas M10 | Upstash/ElastiCache small | CDN bucket | Pre-production validation |
| production | 2+ API tasks | Atlas M10+ dedicated | ElastiCache/Upstash paid | CDN bucket | HA and monitoring |

Use separate MongoDB databases, Redis instances/namespaces, buckets, and secrets per environment.

---

## 5. Database and Indexing

MongoDB collections must match architecture v2:

```text
stores, users, employees, products, stock, sales, customers, suppliers,
wallets, wallet_transactions, invoices, notifications, logs
```

Important indexes:

- `products`: text/search indexes for name, barcode, category.
- `stock`: `{ storeId: 1, productId: 1, receptionDate: 1 }`.
- `sales`: `{ storeId: 1, saleDate: -1 }`, `{ storeId: 1, cashierId: 1, saleDate: -1 }`.
- `customers`: unique `{ storeId: 1, phone: 1 }`.
- `wallet_transactions`: `{ storeId: 1, walletId: 1, timestamp: -1 }`.
- `logs`: `{ storeId: 1, timestamp: -1 }` plus TTL if retention policy requires it.
- `notifications`: `{ storeId: 1, targetUserId: 1, isRead: 1, createdAt: -1 }`.

Do not provision indexes for removed collections such as `stock_batches`, `stock_movements`, or `sale_items`.

---

## 6. Redis Usage

Redis is required for:

- BullMQ queues.
- Socket.IO adapter for multi-instance realtime.
- Idempotency keys.
- Refresh token revocation/rotation support where implemented in Redis.
- Rate limiting.
- Short-lived cache:
  - `product:{barcode}`
  - `dashboard:admin:daily:{storeId}`
  - `stock:alert:count:{storeId}`
  - `customer:{phone}:{storeId}`

Production eviction policy should favor expiring keys, for example `volatile-lru`.

---

## 7. Queues and Workers

Recommended BullMQ queues:

| Queue | Worker | Purpose |
|-------|--------|---------|
| `pdf` | document worker | Invoice/report PDF generation |
| `whatsapp` | communication worker | WhatsApp document/message sends |
| `email` | communication worker | Invoice/report/admin emails |
| `reports` | report worker | Excel and scheduled report generation |
| `alerts` | notification worker | Anti-spam checks and notification fanout |
| `ai` | AI worker | Long-running AI/report tasks if needed |
| `backup` | backup worker | Database backup jobs |

Default job behavior:

- 3 attempts.
- Exponential backoff.
- Failed-job retention for inspection.
- Alert on repeated failures.

---

## 8. Networking and Security

Production network baseline:

- HTTPS only.
- TLS certificates from ACM/Let's Encrypt.
- API and workers in private subnets where using cloud VPC.
- MongoDB and Redis reachable only from API/workers.
- WebSocket upgrade enabled for `/socket.io`.
- Sticky sessions are recommended for Socket.IO, with Redis adapter still required for scale.
- Secrets injected by the platform, never committed.

Security groups/firewall:

| Service | Inbound | Outbound |
|---------|---------|----------|
| Load balancer | 443 public | API port |
| API | API port from load balancer | MongoDB, Redis, S3, WhatsApp, email, LLM |
| Workers | none public | MongoDB, Redis, S3, WhatsApp, email, LLM |
| MongoDB | API/worker only | managed |
| Redis | API/worker only | managed |

---

## 9. Object Storage

Buckets:

- `shopmanager-<env>-invoices`
- `shopmanager-<env>-reports`
- `shopmanager-<env>-backups`

Rules:

- PDF URLs returned to clients must be signed and time-limited.
- Production invoice/report files must not rely on API local disk.
- Local disk may be used only as temporary worker scratch space.
- Enable bucket versioning for backups.
- Apply lifecycle policies for long-term invoice/report retention.

---

## 10. Environment Variables

Core variables:

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
EMAIL_PROVIDER=
SMTP_URL=
PDF_STORAGE=local|s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_INVOICES=
S3_BUCKET_REPORTS=
S3_BUCKET_BACKUPS=
LLM_PROVIDER=openai|mistral|ollama
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
```

Frontend public variables:

```env
VITE_API_BASE_URL=
VITE_SOCKET_URL=
```

No secret may be exposed through `VITE_*`.

---

## 11. CI/CD

Pipeline stages:

1. Install dependencies.
2. Lint, typecheck, unit tests.
3. Integration tests with MongoDB/Redis test services.
4. Build frontend.
5. Build backend/worker image.
6. Push image to registry.
7. Deploy API and workers.
8. Upload frontend assets and invalidate CDN.
9. Run smoke tests:
   - `GET /health`
   - login
   - product search
   - Socket.IO connection

Production deployment should require manual approval.

---

## 12. Monitoring and Alerts

Track:

- API latency and 5xx rate.
- Auth/login failure rate.
- MongoDB connection pool and slow queries.
- Redis memory and connection count.
- BullMQ queue length and failed jobs.
- Socket.IO connection count.
- PDF generation failures.
- WhatsApp/email failures.
- LLM failures/timeouts.
- Backup success/failure.

Log format should be structured JSON with `requestId`, `userId`, `storeId`, route, status, and duration.

---

## 13. Backup and Disaster Recovery

MongoDB:

- Daily snapshots minimum.
- Point-in-time recovery where available.
- Restore procedure tested before production launch.

Object storage:

- Version backups.
- Consider cross-region replication for production.

Redis:

- Treat queues/idempotency/refresh revocations as operational state.
- Use managed persistence where possible in production.

Targets:

| Component | RTO | RPO |
|-----------|-----|-----|
| MongoDB | 2 hours | 15-60 minutes |
| API/workers | 30 minutes | none |
| Object storage | 1 hour | 1 hour |

---

## 14. Scaling Strategy

| Stage | API | Workers | MongoDB | Redis |
|-------|-----|---------|---------|-------|
| MVP | 1 instance | same host or 1 worker | Atlas M0/M2 | Upstash free/local |
| V1 | 2 API instances | 2 workers | Atlas M10 | paid Redis |
| Growth | 4-6 API instances | scale per queue | Atlas M30+ | clustered Redis |
| V2 | split critical services if needed | dedicated worker pools | sharding by `storeId` | Redis cluster |

Known bottlenecks:

- PDF generation: scale document workers.
- Dashboard aggregations: cache and precompute.
- Product search: move to Atlas Search when text indexes are insufficient.
- High-volume sales: review stock FIFO transaction contention.

---

## 15. Production Launch Runbook

1. Provision database, Redis, object storage, secrets, and DNS.
2. Deploy API and worker services.
3. Deploy frontend and configure API/socket URLs.
4. Apply MongoDB indexes.
5. Seed initial admin/store/wallet/settings.
6. Verify login, product CRUD, stock receipt, sale, invoice job, Socket.IO, and backup.
7. Enable monitoring and alerts.
8. Run restore rehearsal.
9. Freeze contract changes for launch.

---

End of Infrastructure Plan - SHOPMANAGER PRO v2.0
