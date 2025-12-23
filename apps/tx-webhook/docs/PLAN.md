# Solana Transaction Webhook Service - Implementation Plan

## Executive Summary
Build a production-ready webhook notification service that monitors Solana transactions and sends notifications upon confirmation. The service uses Express.js for REST API, PostgreSQL for persistence, Redis for caching, and BullJS for background job scheduling.

## Current State Analysis
- **Project Setup**: Basic TypeScript configuration with ES modules (nodenext)
- **Dependencies**: Only TypeScript, tsx, and @types/node installed
- **Code**: Empty src/index.ts with placeholder console.log
- **Infrastructure**: No database, Redis, or API framework installed

## Architecture Overview

### System Components
```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/monitor
       ▼
┌─────────────────────┐
│   Express API       │
│  - POST /monitor    │◄───┐
│  - GET /monitor/:id │    │
└──────┬──────────────┘    │
       │                   │
       ▼                   │
┌─────────────────┐        │
│   PostgreSQL    │        │ Query Status
│   (monitors)    │        │
└────────┬────────┘        │
         │                 │
         │ Monitor Records │
         ▼                 │
┌──────────────────────────┴──┐
│   BullJS Background Job     │
│   (runs every 10 seconds)   │
└──────┬──────────────────────┘
       │
       ├──► Solana RPC (Mock) + Redis Cache
       │
       └──► Webhook Sender ──► User's Webhook URL
```

### Data Flow
1. User submits transaction signature via POST /api/monitor
2. API validates input and stores in PostgreSQL with status 'monitoring'
3. Background job polls every 10 seconds
4. For each monitoring transaction:
   - Checks Solana RPC (with Redis cache)
   - If confirmed → sends webhook → updates status to 'confirmed'
   - If not found after 5 minutes → updates status to 'failed'
   - If webhook fails → retries up to 3 times → marks as 'webhook_failed'

## Critical Edge Cases & Solutions

### 1. Race Conditions
**Problem**: Multiple BullJS workers might process the same transaction simultaneously
**Solution**:
- Use PostgreSQL row-level locking with `SELECT FOR UPDATE`
- Or use BullJS single-concurrency job configuration
- Add optimistic locking with version field

### 2. Duplicate Signature Submissions
**Problem**: Same signature submitted multiple times
**Solution**:
- UNIQUE constraint on signature column in database
- Return 409 Conflict with existing monitor ID if duplicate detected

### 3. Webhook Endpoint Failures
**Problem**: User's webhook URL might be down, slow, or return errors
**Solution**:
- Implement exponential backoff retry (3 attempts max)
- Use timeout of 10 seconds for webhook requests
- Track retry_count and last_error in database
- Move to 'webhook_failed' status after exhausting retries

### 4. Transaction Timeout (5 minutes)
**Problem**: Transaction might never confirm
**Solution**:
- Track `created_at` timestamp
- In background job, check if (now - created_at) > 5 minutes
- If timeout reached and still not confirmed → mark as 'failed'

### 5. Database Connection Failures
**Problem**: PostgreSQL connection might drop during operation
**Solution**:
- Use connection pooling with retry logic
- Implement graceful degradation (return 503 Service Unavailable)
- Use pg-pool with reconnection strategy

### 6. Redis Cache Failures
**Problem**: Redis might be unavailable
**Solution**:
- Make Redis optional - fallback to direct RPC calls
- Implement circuit breaker pattern
- Don't fail the entire operation if cache is down

### 7. Signature Format Validation
**Problem**: Invalid signature formats should be rejected early
**Solution**:
- Validate signature is exactly 88 characters
- Validate it's valid base58 encoding
- Return 400 Bad Request with clear error message

### 8. Webhook URL Validation
**Problem**: Malicious or invalid URLs
**Solution**:
- Must be valid HTTPS URL (reject HTTP)
- Use URL parsing to validate format
- Optionally block localhost/private IP ranges in production

### 9. Memory Leaks in Background Job
**Problem**: Long-running jobs might accumulate memory
**Solution**:
- Release database connections properly in finally blocks
- Limit batch size of monitors to process per job run
- Monitor job memory usage

### 10. Clock Skew Issues
**Problem**: Server time vs database time might differ
**Solution**:
- Always use database `NOW()` for timestamps
- Use UTC consistently across the system

## Implementation Plan

### Phase 1: Dependencies & Environment Setup (5 min)

**Install Required Packages:**
```bash
pnpm add express pg redis bullmq ioredis
pnpm add -D @types/express @types/pg jest ts-jest @types/jest supertest @types/supertest
```

**Create Environment Configuration:**
- `.env.example` with all required variables
- Config loader module `src/config/index.ts`

**Environment Variables:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/tx_webhook
REDIS_URL=redis://localhost:6379
PORT=3000
SOLANA_RPC_URL=http://localhost:8899
WEBHOOK_TIMEOUT_MS=10000
MAX_WEBHOOK_RETRIES=3
MONITOR_JOB_INTERVAL_MS=10000
TRANSACTION_TIMEOUT_MS=300000
```

### Phase 2: Database Schema & Connection (5 min)

**Files to Create:**
- `src/db/schema.sql` - Database schema
- `src/db/index.ts` - PostgreSQL connection pool
- `src/db/migrations/001_initial_schema.sql` - Migration script

**Database Schema:**
```sql
CREATE TABLE monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature VARCHAR(88) UNIQUE NOT NULL,
  webhook_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'monitoring',
  confirmed_at TIMESTAMP,
  webhook_sent_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_monitors_status ON monitors(status);
CREATE INDEX idx_monitors_created_at ON monitors(created_at);
```

**Connection Pool Setup:**
- Use `pg.Pool` with connection limits
- Implement health check query
- Export typed client interface

### Phase 3: Mock Solana RPC Service (10 min)

**Files to Create:**
- `src/services/solana-rpc.ts` - Mock RPC implementation with configurable behavior

**Implementation Details:**
```typescript
interface SolanaRPC {
  getTransaction(signature: string): Promise<{
    confirmed: boolean;
    slot?: number;
    blockTime?: number;
  } | null>;
}
```

**Mock Behavior:**
- Track check count per signature in memory Map
- 50% confirmed on first check (return transaction data)
- 30% confirmed on third check
- 20% never confirmed (always return null)
- Use randomization seeded by signature hash for consistency

### Phase 4: Redis Cache Layer (5 min)

**Files to Create:**
- `src/services/cache.ts` - Redis wrapper with fallback

**Implementation:**
- Cache RPC responses for 5 seconds
- Key format: `rpc:tx:{signature}`
- Graceful fallback if Redis unavailable
- Implement get/set/delete operations

### Phase 5: Express API Server (15 min)

**Files to Create:**
- `src/app.ts` - Express app configuration
- `src/routes/monitor.ts` - Monitor routes
- `src/middleware/error-handler.ts` - Centralized error handling
- `src/middleware/validator.ts` - Input validation middleware
- `src/types/index.ts` - TypeScript interfaces

**API Endpoints:**

**POST /api/monitor**
- Validate signature (88 chars, base58)
- Validate webhook URL (HTTPS, valid URL format)
- Check for duplicate signature
- Insert into database
- Return monitor ID and status

**GET /api/monitor/:id**
- Validate UUID format
- Query database by ID
- Return monitor status with all fields
- Return 404 if not found

**Error Responses:**
- 400 Bad Request - validation errors
- 404 Not Found - monitor not found
- 409 Conflict - duplicate signature
- 500 Internal Server Error - server errors

### Phase 6: Webhook Sender Service (10 min)

**Files to Create:**
- `src/services/webhook-sender.ts` - Webhook HTTP client

**Implementation:**
```typescript
interface WebhookPayload {
  monitorId: string;
  signature: string;
  status: string;
  confirmedAt: string;
  slot?: number;
  blockTime?: number;
}

async function sendWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
  retryCount: number
): Promise<{ success: boolean; error?: string }>
```

**Features:**
- Use fetch or axios with timeout (10s)
- Retry logic with exponential backoff
- Log webhook attempts (success/failure)
- Return detailed error messages
- Handle network errors, timeouts, 4xx/5xx responses

### Phase 7: Background Job with BullJS (20 min)

**Files to Create:**
- `src/jobs/monitor-transactions.ts` - Job processor
- `src/jobs/queue.ts` - Queue setup and configuration

**Implementation Strategy:**

**Queue Configuration:**
- Use BullMQ (modern version of Bull)
- Set up repeatable job (every 10 seconds)
- Configure concurrency (recommend 1 to avoid race conditions)
- Set up job lifecycle handlers

**Job Processor Logic:**
```typescript
async function processMonitoringTransactions() {
  // 1. Get all monitors with status = 'monitoring'
  const monitors = await getMonitoringTransactions();

  for (const monitor of monitors) {
    try {
      // 2. Check timeout (5 minutes)
      if (isTimeout(monitor.created_at)) {
        await updateMonitorStatus(monitor.id, 'failed');
        continue;
      }

      // 3. Check transaction status (with cache)
      const txStatus = await checkTransactionWithCache(monitor.signature);

      if (!txStatus) {
        // Not confirmed yet, continue monitoring
        continue;
      }

      // 4. Transaction confirmed - send webhook
      const webhookResult = await sendWebhook(monitor.webhook_url, {
        monitorId: monitor.id,
        signature: monitor.signature,
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        slot: txStatus.slot,
        blockTime: txStatus.blockTime
      }, monitor.retry_count);

      // 5. Update database based on webhook result
      if (webhookResult.success) {
        await updateMonitorStatus(monitor.id, 'confirmed', {
          confirmed_at: new Date(),
          webhook_sent_at: new Date()
        });
      } else {
        // Increment retry count
        if (monitor.retry_count >= MAX_RETRIES) {
          await updateMonitorStatus(monitor.id, 'webhook_failed', {
            confirmed_at: new Date(),
            last_error: webhookResult.error
          });
        } else {
          await incrementRetryCount(monitor.id, webhookResult.error);
        }
      }
    } catch (error) {
      console.error(`Error processing monitor ${monitor.id}:`, error);
      // Continue with next monitor, don't fail entire job
    }
  }
}
```

**Database Queries Needed:**
- `getMonitoringTransactions()` - SELECT with FOR UPDATE SKIP LOCKED
- `updateMonitorStatus()` - UPDATE with timestamps
- `incrementRetryCount()` - Atomic increment

### Phase 8: Integration & Main Entry Point (5 min)

**Files to Create/Modify:**
- `src/index.ts` - Main application entry point

**Startup Sequence:**
```typescript
async function main() {
  // 1. Load environment configuration
  // 2. Initialize database connection pool
  // 3. Test database connectivity
  // 4. Initialize Redis connection (optional)
  // 5. Start BullMQ worker and queue
  // 6. Start Express server
  // 7. Set up graceful shutdown handlers
}
```

**Graceful Shutdown:**
- Handle SIGTERM and SIGINT
- Close database connections
- Close Redis connection
- Stop accepting new requests
- Wait for in-flight requests to complete
- Exit cleanly

### Phase 9: Testing (10 min)

**Files to Create:**
- `src/__tests__/api.test.ts` - API endpoint tests
- `src/__tests__/monitor-job.test.ts` - Background job tests
- `src/__tests__/webhook-sender.test.ts` - Webhook sender tests
- `jest.config.js` - Jest configuration

**Test Coverage:**

**API Tests (using supertest):**
1. ✅ POST /api/monitor - reject invalid signature format
2. ✅ POST /api/monitor - reject invalid webhook URL
3. ✅ POST /api/monitor - reject duplicate signature (409)
4. ✅ POST /api/monitor - successful creation returns monitor ID
5. ✅ GET /api/monitor/:id - return 404 for non-existent ID
6. ✅ GET /api/monitor/:id - return monitor details

**Background Job Tests:**
1. ✅ Update status to 'confirmed' when transaction found
2. ✅ Update status to 'failed' when timeout reached (5 min)
3. ✅ Increment retry_count on webhook failure
4. ✅ Update to 'webhook_failed' after max retries
5. ✅ Cache RPC responses in Redis

**Webhook Sender Tests:**
1. ✅ Successful webhook delivery
2. ✅ Retry on failure with exponential backoff
3. ✅ Timeout after 10 seconds

**Test Setup:**
- Use in-memory or test database
- Mock Redis with ioredis-mock
- Mock HTTP requests for webhooks
- Clean up test data after each test

### Phase 10: Documentation & Final Touches (5 min)

**Files to Create:**
- `README.md` - Update with setup instructions
- `docs/API.md` - API documentation
- `docs/ARCHITECTURE.md` - System architecture
- `.env.example` - Environment template

**README Sections:**
- Quick start guide
- Prerequisites (Node.js, PostgreSQL, Redis)
- Installation steps
- Running the service
- Running tests
- Environment variables
- API usage examples

## File Structure

```
tx-webhook/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── app.ts                      # Express app setup
│   ├── config/
│   │   └── index.ts               # Configuration loader
│   ├── db/
│   │   ├── index.ts               # Database connection pool
│   │   ├── schema.sql             # Database schema
│   │   └── queries.ts             # SQL queries
│   ├── routes/
│   │   └── monitor.ts             # Monitor API routes
│   ├── middleware/
│   │   ├── error-handler.ts       # Error handling
│   │   └── validator.ts           # Input validation
│   ├── services/
│   │   ├── solana-rpc.ts          # Mock Solana RPC
│   │   ├── webhook-sender.ts      # Webhook HTTP client
│   │   └── cache.ts               # Redis cache wrapper
│   ├── jobs/
│   │   ├── queue.ts               # BullMQ queue setup
│   │   └── monitor-transactions.ts # Job processor
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   └── __tests__/
│       ├── api.test.ts
│       ├── monitor-job.test.ts
│       └── webhook-sender.test.ts
├── docs/
│   ├── PLAN.md                    # This file (to be created)
│   ├── API.md
│   └── ARCHITECTURE.md
├── .env.example
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## TypeScript Interfaces

```typescript
// Core types
interface Monitor {
  id: string;
  signature: string;
  webhook_url: string;
  status: 'monitoring' | 'confirmed' | 'failed' | 'webhook_failed';
  confirmed_at: Date | null;
  webhook_sent_at: Date | null;
  retry_count: number;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateMonitorRequest {
  signature: string;
  webhookUrl: string;
}

interface CreateMonitorResponse {
  monitorId: string;
  status: string;
  createdAt: string;
}

interface TransactionStatus {
  confirmed: boolean;
  slot?: number;
  blockTime?: number;
}

interface WebhookPayload {
  monitorId: string;
  signature: string;
  status: string;
  confirmedAt: string;
  slot?: number;
  blockTime?: number;
}
```

## Performance Considerations

1. **Database Indexing**: Index on `status` and `created_at` for efficient queries
2. **Connection Pooling**: Limit PostgreSQL connections (max 10-20)
3. **Redis TTL**: 5-second cache prevents RPC spam
4. **Batch Processing**: Process monitors in batches if volume is high
5. **Job Concurrency**: Single worker to avoid race conditions
6. **Query Optimization**: Use `SELECT FOR UPDATE SKIP LOCKED` for atomic processing

## Security Considerations

1. **HTTPS Only**: Reject HTTP webhook URLs
2. **URL Validation**: Prevent SSRF by validating webhook URLs
3. **Input Sanitization**: Validate all inputs before database insertion
4. **SQL Injection**: Use parameterized queries (pg library handles this)
5. **Rate Limiting**: Consider adding rate limiting to POST endpoint
6. **Environment Secrets**: Never commit .env file

## Monitoring & Observability

1. **Logging**: Log all webhook attempts, job runs, errors
2. **Metrics**: Track monitor counts by status, webhook success rate
3. **Health Checks**: Add /health endpoint for load balancers
4. **Database Monitoring**: Monitor connection pool usage
5. **Job Monitoring**: BullMQ provides built-in monitoring

## Time Allocation (1 hour total)

- ✅ Setup (5 min): Dependencies, environment, database schema
- ✅ Database (5 min): Connection pool, queries
- ✅ Solana RPC Mock (10 min): Implement mock with proper behavior
- ✅ API Endpoints (15 min): POST /monitor, GET /monitor/:id with validation
- ✅ Webhook Sender (10 min): HTTP client with retry logic
- ✅ Background Job (20 min): BullMQ setup and transaction monitoring logic
- ✅ Testing (10 min): Core tests for validation and status updates
- ✅ Final touches (5 min): Documentation, cleanup

## Success Criteria

1. ✅ POST /api/monitor accepts valid requests and rejects invalid ones
2. ✅ GET /api/monitor/:id returns current status
3. ✅ Background job runs every 10 seconds
4. ✅ Webhooks are sent when transactions confirm
5. ✅ Redis caching reduces RPC calls
6. ✅ Failed webhooks are retried (max 3 times)
7. ✅ Transactions timeout after 5 minutes
8. ✅ At least 2 tests pass
9. ✅ Clean, readable code structure
10. ✅ No race conditions or duplicate processing

## Future Enhancements (Out of Scope)

- Batch monitoring (submit multiple signatures)
- Webhook signature verification (HMAC)
- Real Solana RPC integration
- Advanced retry strategies (exponential backoff with jitter)
- Monitoring dashboard
- Prometheus metrics export
- Authentication/API keys
- Horizontal scaling with multiple workers

## Notes

- **ESM Modules**: Project uses ES modules (package.json has `"type": "module"`)
- **TypeScript**: Configured with strict mode and nodenext module resolution
- **Code Quality**: Focus on clean, maintainable code over premature optimization
- **Error Handling**: Comprehensive error handling with proper status codes
- **Testing**: Prioritize critical path tests within time constraint
