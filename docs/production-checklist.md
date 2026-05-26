# ShopManager Pro — Production Readiness Checklist

## Environment & Configuration

- [ ] `NODE_ENV=production` set on all services
- [ ] `MONGODB_URI` points to production MongoDB Atlas cluster (M10+)
- [ ] `REDIS_URL` points to production Redis (Upstash / ElastiCache)
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong, unique values
- [ ] `LLM_API_KEY` is configured (if AI features enabled)
- [ ] `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` configured
- [ ] `SMTP_URL` configured for email sending
- [ ] `S3_BUCKET_*` variables configured for object storage
- [ ] `VITE_API_BASE_URL` and `VITE_SOCKET_URL` point to production API
- [ ] No secrets exposed through `VITE_*` environment variables
- [ ] `.env.example` is up to date with no secrets

## Security

- [ ] HTTPS enforced (TLS certificates via ACM / Let's Encrypt)
- [ ] CORS configured to allow only frontend origin
- [ ] Rate limiting enabled on auth (5/15min) and general API (100/min)
- [ ] Idempotency keys enforced on: `POST /sales`, `/stock/receive`, `/stock/adjust`, `/customers/:id/debt/pay`, `/suppliers/:id/pay`, `/wallets/transfer`
- [ ] RBAC middleware applied to all protected routes
- [ ] `purchasePrice` and `profit` hidden from employee role
- [ ] Store isolation enforced on every query
- [ ] JWT tokens expire appropriately (access: 15min, refresh: 7d)
- [ ] Refresh token rotation and revocation implemented
- [ ] Logs collection is append-only (no update/delete)
- [ ] Wallet transactions collection is append-only

## Database

- [ ] MongoDB indexes created per `docs/infra-plan.md` §5
- [ ] Text indexes on products (name, barcode, dci)
- [ ] TTL index on idempotency records (24h)
- [ ] Point-in-time recovery enabled on Atlas
- [ ] Daily snapshots configured

## Infrastructure

- [ ] API and workers deployed in private subnets
- [ ] MongoDB and Redis accessible only from API/workers
- [ ] Load balancer configured with WebSocket upgrade
- [ ] Sticky sessions enabled for Socket.IO (with Redis adapter)
- [ ] Object storage buckets created with versioning
- [ ] Backup worker running and tested

## Monitoring

- [ ] Structured JSON logging in production
- [ ] API latency and 5xx rate monitored
- [ ] Auth failure rate monitored
- [ ] BullMQ queue lengths and failed jobs monitored
- [ ] MongoDB connection pool and slow queries monitored
- [ ] PDF/WhatsApp/Email failure rates monitored
- [ ] LLM failure/timeout rate monitored
- [ ] Backup success/failure monitored

## Testing

- [ ] Sale transaction rollback test passes
- [ ] FIFO stock selection test passes
- [ ] Wallet transfer atomicity test passes
- [ ] Debt payment atomicity test passes
- [ ] Append-only logs test passes
- [ ] RBAC field hiding test passes
- [ ] Load test meets agreed thresholds

## Deployment

- [ ] Frontend build passes (`npm run build`)
- [ ] Backend lint passes (`npm run lint`)
- [ ] Integration tests pass
- [ ] Production secrets injected via platform (not in code)
- [ ] Restore rehearsal completed
- [ ] Deployment runbook documented and reviewed
- [ ] Rollback plan documented

## Post-Launch

- [ ] First backup verified as restorable
- [ ] Monitoring alerts configured and tested
- [ ] Support contact established for MongoDB Atlas / Redis
- [ ] Incident response plan documented
