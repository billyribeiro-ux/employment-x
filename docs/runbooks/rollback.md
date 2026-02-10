# Rollback Runbook

## Application Rollback

### Next.js Web (Vercel/Docker)
```bash
# Option 1: Git revert
git revert HEAD
git push origin main

# Option 2: Deploy previous tag
git checkout v0.5.0-m5
pnpm turbo build
# Deploy via your CI/CD pipeline
```

### Rust API
```bash
# Revert to last known-good commit
git log --oneline -10
git revert <bad-commit>
cargo build --release
```

## Database Rollback

### Prisma Migration Rollback
```bash
cd apps/web
# Check migration status
pnpm exec prisma migrate status

# Rollback last migration (creates a new migration that undoes changes)
pnpm exec prisma migrate resolve --rolled-back <migration_name>
```

### Manual SQL Rollback
```sql
-- Always wrap in transaction
BEGIN;
-- Your rollback SQL here
COMMIT;
```

## Queue Rollback

### BullMQ — Drain and Restart
```bash
# Connect to Redis CLI
redis-cli

# Check queue sizes
LLEN bull:reminders:wait
LLEN bull:notifications:wait
LLEN bull:demo-cleanup:wait

# Pause a queue (workers stop picking up jobs)
# Done programmatically via worker.pause()

# Drain failed jobs
# Done via BullMQ dashboard or programmatically
```

## Verification After Rollback
```bash
# 1. Health check
curl http://localhost:3000/api/v1/health

# 2. Run security tests
pnpm exec vitest run tests/security/

# 3. Run full test suite
pnpm turbo test

# 4. Check audit log for anomalies
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/v1/admin/audit-export?days=1
```

## Decision Matrix
| Scenario | Action | Rollback Time |
|----------|--------|---------------|
| Bad deploy, no data changes | Git revert + redeploy | 5 min |
| Bad migration, no data loss | Prisma rollback | 15 min |
| Bad migration, data corrupted | Restore from backup | 1-4 hours |
| Queue poisoned | Drain + restart workers | 10 min |
| Auth/session compromise | Revoke all sessions + rotate secrets | 30 min |
