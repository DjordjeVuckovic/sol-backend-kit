# Solana Transaction Webhook Service
**Time Limit: 1 hour**

## Problem Statement

Build a service that monitors Solana transactions and sends webhook notifications when they're confirmed. Users submit a transaction signature, and your service tracks it until confirmation, then notifies them via webhook.

## Core Features

### 1. Submit Transaction for Monitoring ⭐
**POST /api/monitor**

**Input:**
```json
{
  "signature": "3x7KhRw...",
  "webhookUrl": "https://user-app.com/webhook"
}
```

**Output:**
```json
{
  "monitorId": "mon_123",
  "status": "monitoring",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Validation:**
- Signature must be 88 characters (base58)
- Webhook URL must be valid HTTPS
- Same signature can't be submitted twice

### 2. Background Monitor ⭐
**Every 10 seconds, check all pending transactions:**

1. Fetch transaction status from Solana RPC (mock)
2. If confirmed → send webhook notification
3. Update status in database
4. Retry failed webhooks (max 3 attempts)

**Status Flow:**
- `monitoring` → actively checking
- `confirmed` → found on blockchain, webhook sent
- `failed` → not found after 5 minutes
- `webhook_failed` → confirmed but webhook failed

### 3. Get Monitor Status
**GET /api/monitor/:id**

**Output:**
```json
{
  "monitorId": "mon_123",
  "signature": "3x7KhRw...",
  "status": "confirmed",
  "confirmedAt": "2024-01-15T10:01:30Z",
  "webhookSentAt": "2024-01-15T10:01:31Z",
  "attempts": 1
}
```

## Tech Stack

**Required:**
- Node.js + Express.js
- PostgreSQL (store monitors)
- Redis (cache RPC responses)
- BullJS (scheduled job every 10s)
- Jest (2 tests minimum)

## Database Schema (5 min)

```sql
CREATE TABLE monitors (
  id UUID PRIMARY KEY,
  signature VARCHAR(88) UNIQUE,
  webhook_url TEXT,
  status VARCHAR(20),
  confirmed_at TIMESTAMP,
  webhook_sent_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Mock Solana RPC (Provided)

```typescript
interface SolanaRPC {
  // Returns null if not found, or transaction details if confirmed
  getTransaction(signature: string): Promise<{
    confirmed: boolean;
    slot?: number;
    blockTime?: number;
  } | null>;
}

// Simulates: 50% confirmed immediately, 30% after 2 checks, 20% never found
```

## What You Build

### 1. API Endpoint (15 min)
```typescript
// POST /api/monitor
app.post('/api/monitor', async (req, res) => {
  // 1. Validate input
  // 2. Save to PostgreSQL
  // 3. Return monitor ID
});

// GET /api/monitor/:id
app.get('/api/monitor/:id', async (req, res) => {
  // Return current status from DB
});
```

### 2. Background Job (30 min)
```typescript
// BullJS job runs every 10 seconds
async function checkPendingTransactions() {
  // 1. Get all monitors with status 'monitoring'
  // 2. For each:
  //    - Check Solana RPC (with Redis cache)
  //    - If confirmed → send webhook + update DB
  //    - If not found after 5 min → mark as failed
  // 3. Handle webhook failures (retry logic)
}
```

### 3. Webhook Sender (10 min)
```typescript
async function sendWebhook(webhookUrl: string, data: any) {
  // POST to webhook URL with transaction data
  // Return success/failure
  // Log for debugging
}
```

### 4. Tests (5 min)
```typescript
describe('Monitor Service', () => {
  test('should reject invalid signature');
  test('should update status when confirmed');
});
```

## Time Breakdown

```
0:00-0:05  Setup project + dependencies
0:05-0:10  Database schema
0:10-0:25  POST /api/monitor endpoint
0:25-0:30  GET /api/monitor/:id endpoint
0:30-0:50  Background job logic
0:50-0:55  Basic tests
0:55-1:00  Demo
```

## Key Challenges

1. **Efficient polling**: Don't spam Solana RPC
2. **Retry logic**: Webhooks might fail, need retries
3. **Timeout handling**: Mark as failed after 5 minutes
4. **Race conditions**: Multiple job workers checking same transaction

## Evaluation

✅ **Working webhook delivery** (core feature)
✅ **Scheduled job with BullJS** (every 10s)
✅ **Redis caching** (cache RPC responses for 5s)
✅ **Error handling** (webhook failures, timeouts)
✅ **Code structure** (clean, readable)

## Example Flow

```
User submits signature → Saved to DB as 'monitoring'
                      ↓
              Background job runs (10s)
                      ↓
              Checks Solana RPC
                      ↓
         Transaction confirmed? YES
                      ↓
         Send webhook notification
                      ↓
         Update DB status: 'confirmed'
```

## Webhook Payload

```json
POST https://user-app.com/webhook
{
  "monitorId": "mon_123",
  "signature": "3x7KhRw...",
  "status": "confirmed",
  "confirmedAt": "2024-01-15T10:01:30Z",
  "slot": 123456789,
  "blockTime": 1705315290
}
```

## Questions to Ask

- Should I retry failed webhooks forever or give up?
- What happens if webhook URL is down?
- Do I need to validate that signature exists on Solana?
- Should I support batch monitoring (multiple signatures)?

## What We DON'T Need

❌ Transaction creation
❌ Wallet management  
❌ Authentication
❌ Real Solana RPC (use mock)
❌ Complex retry strategies
❌ Webhook signing/verification

---

**Focus**: Working webhook system + reliable background job + error handling

**Goal**: Show you can build event-driven systems with Solana

Sretno! 🚀
