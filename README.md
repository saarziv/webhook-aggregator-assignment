# Webhook Aggregator

An event ingestion microservice that receives webhook events, applies per-tenant rate limiting, processes them asynchronously, and exposes analytics.

## Running

**Full stack (app + Redis):**
```bash
docker-compose up
```

**Development (Redis only, app runs locally with hot reload):**
```bash
docker-compose up redis
npm run dev
```

## API

### POST /v1/events
Ingest a webhook event.

```json
{
  "tenantId": "string",
  "eventType": "string",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": {}
}
```

Returns `202 Accepted` or `429 Too Many Requests` if rate limited (5 req/s per tenant).

### GET /v1/analytics/:tenantId
Returns aggregated stats for a tenant.

```json
{
  "tenantId": "tenant-1",
  "eventBreakdown": { "email.sent": 10, "email.failed": 2 },
  "rateLimitedCount": 3
}
```

## Testing

```bash
npm test
```

Requires Redis running on port 6379 (integration tests hit real Redis).

## Architecture & Trade-offs

### Rate Limiter — Redis Sorted Set + Lua Script
Each request is checked against a sorted set keyed by `rate_limit:{tenantId}`, where members are scored by timestamp. A Lua script atomically removes expired entries, counts the remainder, and either blocks or admits the request.

**Why Lua?** Without atomic execution, a race condition between the count check and the new entry insertion would allow bursts beyond the limit under concurrent load.

**Why sorted set over a simple counter?** A counter with TTL only supports fixed windows (request 5 at t=0.9s and request 6 at t=1.1s would both be admitted). Sorted sets enable true sliding windows.

### Async Processing — BullMQ + Redis
Valid events are immediately enqueued to BullMQ with a 200ms delay, keeping the API response time unaffected by processing work. The worker runs in-process (same NestJS instance) rather than a separate service — sufficient for this scale and avoids deployment complexity.

**Two separate Redis connections:** ioredis (rate limiter raw commands) and BullMQ's own connection pool (worker blocking calls). Sharing a connection would cause BullMQ's blocking commands to stall other Redis operations.

### Event Storage — Redis Hash
Processed event counts are stored as `HINCRBY events:{tenantId} {eventType} 1`. A single `HGETALL events:{tenantId}` retrieves all event type counts in one call — no SCAN, no aggregation, O(n) where n is unique event types per tenant.

### Rate-Limited Request Tracking — Redis Sorted Set
Blocked requests are recorded as `ZADD rate_limited:{tenantId} {timestamp} {member}`. Analytics uses `ZCOUNT` with a 15-minute window — same pattern as the rate limiter, query cost is O(log n).
