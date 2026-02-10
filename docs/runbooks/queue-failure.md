# Queue Failure Handling Runbook

## Architecture
- **BullMQ** with Redis backend
- 4 queues: `reminders`, `notifications`, `demo-cleanup`, `emails`
- Workers with exponential backoff (3 attempts, 1s base delay)
- Dead Letter Queue (DLQ) after max retries exhausted

## Monitoring

### Check Queue Health
```bash
# Redis CLI — check queue depths
redis-cli LLEN bull:reminders:wait
redis-cli LLEN bull:reminders:active
redis-cli LLEN bull:reminders:failed
redis-cli LLEN bull:notifications:wait
redis-cli LLEN bull:notifications:failed
redis-cli LLEN bull:demo-cleanup:wait
redis-cli LLEN bull:emails:wait
redis-cli LLEN bull:emails:failed
```

### Alert Thresholds
| Queue | Wait > | Failed > | Action |
|-------|--------|----------|--------|
| reminders | 100 | 10 | Page on-call |
| notifications | 500 | 50 | Page on-call |
| emails | 200 | 20 | Page on-call |
| demo-cleanup | 50 | 5 | Log warning |

## Failure Scenarios

### 1. Redis Connection Lost
**Symptoms**: All queues stalled, workers disconnected
**Fix**:
```bash
# Check Redis
redis-cli ping
# Restart Redis if needed
sudo systemctl restart redis
# Workers auto-reconnect via ioredis
```

### 2. Worker Crash Loop
**Symptoms**: Jobs keep failing immediately
**Fix**:
```bash
# Check worker logs for root cause
# Pause the queue
# Fix the bug
# Resume the queue — jobs will retry
```

### 3. Poison Message (Bad Payload)
**Symptoms**: Single job fails repeatedly, blocks queue
**Fix**:
```bash
# Identify the job via BullMQ dashboard or Redis
# Remove the poisoned job
redis-cli LREM bull:<queue>:failed 1 <job-id>
# Or programmatically: queue.remove(jobId)
```

### 4. DLQ Overflow
**Symptoms**: Failed job count growing
**Fix**:
1. Investigate root cause from failed job data
2. Fix the underlying issue
3. Retry failed jobs: `queue.retryJobs({ status: 'failed' })`
4. Or drain: `queue.drain()`

## Idempotency
All critical job processors check `idempotency_keys` table before executing.
Re-running a job is safe — duplicate processing is prevented at the application layer.

## Recovery Checklist
- [ ] Redis connectivity verified
- [ ] Worker processes running
- [ ] Queue depths returning to normal
- [ ] Failed job count stable or decreasing
- [ ] No duplicate side effects (check idempotency_keys)
- [ ] Audit log shows expected events
