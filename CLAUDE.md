# Real-Time Webhook Aggregator - Development Rules

## What we're building
An event ingestion microservice that receives webhook events via POST /v1/events,
applies per-tenant rate limiting, processes events asynchronously via BullMQ,
and exposes analytics via GET /v1/analytics/:tenantId.

## Requirements
1. **POST /v1/events**
   - Payload: `{ "tenantId": "string", "eventType": "string", "timestamp": "ISO-8601", "payload": {} }`
   - Sliding Window rate limiter: 5 req/s per tenantId → 429 if exceeded
   - Validation: reject invalid timestamps or missing fields → 400
2. **Async Processing**
   - Enqueue valid events to BullMQ (non-blocking)
   - Worker processes with simulated 200ms delay, persists to in-memory store
3. **GET /v1/analytics/:tenantId**
   - Total events processed, broken down by eventType
   - Rate-limited request count in last 15 minutes
4. **Production Readiness**
   - Unit tests for rate limiter and processing logic
   - docker-compose.yml for execution
   - README.md with architectural trade-offs

## Architecture

### Module Structure
```
src/
├── events/           # POST /v1/events — controller, rate limiter, queue producer
├── processor/        # BullMQ consumer — processes queued events
├── analytics/        # GET /v1/analytics/:tenantId
└── store/            # shared event store (processor writes, analytics reads)
```

### Infrastructure
- Redis via docker-compose (redis:7-alpine, port 6379)
- BullMQ for async queue, backed by Redis
- Rate limiter uses Redis-backed sliding window
- Worker runs in-process (same NestJS instance, not a separate server)

### Implementation Order
1. Scaffolding — NestJS, TypeScript strict, docker-compose with Redis
2. POST /v1/events — controller + validation
3. Rate limiter — sliding window + tests
4. BullMQ — queue producer, processor, store service
5. GET /v1/analytics/:tenantId
6. Polish — Dockerfile, README, remaining tests

## Tech Stack
Node.js, TypeScript, NestJS, Redis, BullMQ

## Commands
- Test: `npm test`
- Build: `npm run build`
- Dev: `npm run dev`

## Engineering Standards
- TypeScript strict mode (`noImplicitAny: true`), no `any` types
- Nest js unit tests, TDD approach for domain logic
- Keep functions pure and decoupled from global server state

## Prompting
- Expect the user to share their plan before implementing — even a high-level one
- Freely disagree and suggest better alternatives with explanations
- Act as a mentor: if the plan is non-ideal, explain why and offer improvements

## Coding Guidelines
- Readability over cleverness — code should explain itself
- Comments explain WHY, not WHAT
- Functions: prefer small and focused, but don't over-fragment
- Naming: descriptive (`getEventsByTenant`, `isRateLimited`, `MAX_REQUESTS_PER_SECOND`), no generic names (`data`, `result`), camelCase for variables, PascalCase for classes
- Error handling: every async function has try/catch, descriptive error messages
- No `any` — use `unknown` and narrow
- File size: consider splitting above ~300 lines, but only if it improves clarity
