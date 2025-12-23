# Backend Technical Challenge - Crypto Wallet Transaction System
**Time Limit: 1 hour**

## Problem Statement

Build a minimal backend service that allows users to send cryptocurrency (SOL) transactions and check their status. Focus on core functionality and demonstrating your problem-solving approach.

## Core Features (Pick 2 of 3)

### 1. Transaction Creation ⭐ (Required)
**As a user, I want to create a transaction to send SOL**

**Input:**
- Wallet address (sender)
- Recipient address
- Amount (in SOL)

**Output:**
- Transaction ID
- Initial status

**Validation:**
- Amount must be > 0.001 SOL
- Addresses must be valid format (simulate: 32-44 alphanumeric chars)
- User must have sufficient balance (assume starting balance: 100 SOL)

**Behavior:**
- Save transaction to database immediately
- Queue it for background processing
- Return success response without waiting for blockchain

### 2. Transaction Processing ⭐ (Required)
**As the system, I need to process transactions in the background**

**Behavior:**
- Pick up queued transactions from Redis/BullJS
- Simulate sending to blockchain (use mock RPC client)
- Update transaction status based on result
- Handle basic retry logic (1-2 retries on failure)

**Transaction States:**
- `pending` → just created
- `processing` → sent to blockchain
- `confirmed` → blockchain confirmed
- `failed` → something went wrong

### 3. Transaction Status (Choose this OR History)
**As a user, I want to check my transaction status**

**Input:**
- Transaction ID

**Output:**
- Current status
- Blockchain signature (if confirmed)
- Error message (if failed)
- Created/updated timestamps

### 4. Transaction History (Alternative to Status)
**As a user, I want to see my recent transactions**

**Input:**
- Wallet address
- Optional: limit (default 10)

**Output:**
- List of transactions (newest first)
- Basic info: id, amount, recipient, status, date

## Technical Requirements

### Must Use
- **Node.js + Express.js** - REST API
- **PostgreSQL** - Store transactions
- **Redis + BullJS** - Background job queue
- **Jest** - At least 2-3 basic tests

### Mock Blockchain Client (Provided)

```typescript
interface SolanaRPC {
  // Simulates sending transaction (70% success rate)
  sendTransaction(from: string, to: string, amount: number): 
    Promise<{ success: boolean; signature?: string; error?: string }>;
  
  // Simulates checking status (returns confirmed after 2-3 calls)
  getTransactionStatus(signature: string): 
    Promise<{ status: 'processing' | 'confirmed' | 'failed' }>;
}
```

## What You Need to Deliver

### 1. Database Schema (5 min)
A simple Transactions table with:
- id, from_address, to_address, amount
- status, blockchain_signature, error_message
- created_at, updated_at

### 2. API Endpoints (15 min)
```
POST   /api/transactions          # Create transaction
GET    /api/transactions/:id      # Get status (or list history)
```

### 3. Background Job (25 min)
- Queue processor that picks up pending transactions
- Calls mock blockchain client
- Updates transaction status in database
- Handles basic error cases

### 4. Tests (10 min)
Write 2-3 tests for critical logic:
- Transaction creation validation
- Balance checking
- Status transitions

### 5. Quick Documentation (5 min)
Brief explanation of:
- How your solution works
- Key design decisions
- What you'd improve with more time

## Key Challenges to Solve

1. **Prevent double-spending**: Same wallet can't create multiple transactions if balance insufficient
2. **Handle async processing**: Don't block API response waiting for blockchain
3. **Error handling**: What happens when blockchain call fails?
4. **Data consistency**: Transaction status must match blockchain state

## Evaluation Focus

✅ **Working code** - Does it run and do what it's supposed to?
✅ **Problem-solving** - How do you approach the key challenges?
✅ **Code structure** - Is it organized and readable?
✅ **Trade-offs** - Can you explain your decisions?

## Time Management

```
0:00 - 0:10  → Read requirements, plan approach, ask questions
0:10 - 0:25  → Set up project + database schema
0:25 - 0:40  → Implement API endpoints + validation
0:40 - 0:50  → Implement background job processing
0:50 - 0:55  → Write basic tests
0:55 - 1:00  → Quick demo + discussion
```

## Questions to Clarify

Before starting, you should ask:
- Can I use Prisma/TypeORM or write raw SQL?
- Should I handle concurrent requests to the same wallet?
- Do I need authentication or can I skip it?
- What should happen if blockchain is down for 5 minutes?

## What We DON'T Expect

❌ Complex microservices architecture
❌ Production-ready monitoring/logging
❌ Comprehensive test coverage (>80%)
❌ Advanced features (webhooks, notifications, pagination)
❌ Perfect code - we want to see how you think and solve problems

---

**Focus on**: Clean code, working solution, good communication about trade-offs.

**Remember**: It's okay if you don't finish everything. We want to see your approach and how you prioritize under time constraints.