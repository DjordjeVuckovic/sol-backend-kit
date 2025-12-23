# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Solana wallet data service that fetches user wallet information from Solana RPC endpoints and stores it in PostgreSQL. The service is built with Node.js, Express, and Prisma.

## Core Requirements (from README.md)

### Main Endpoint: GET /wallet/:address
- Fetches SOL balance and transaction count for a given Solana address from RPC
- Stores the result in PostgreSQL using Prisma
- Returns the stored record as JSON
- Should implement caching to avoid excessive RPC calls

### Technical Focus Areas
- **Async/await patterns**: Handle asynchronous Solana RPC interactions properly
- **Rate limiting**: Manage rate limits when interacting with Solana RPC endpoints
- **Error handling**: Comprehensive error handling for RPC failures, database errors, and invalid addresses
- **Logging**: Clear logging for debugging and monitoring
- **Database design**: Efficient Prisma schema for storing wallet data

## Development Commands

Once the project is set up, typical commands will include:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production build
npm run build
npm start

# Database operations
npx prisma migrate dev    # Run migrations in development
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open Prisma Studio

# Testing
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode
```

## Architecture Considerations

### Solana RPC Integration
- Use `@solana/web3.js` for interacting with Solana network
- Consider using public RPC endpoints initially (e.g., mainnet-beta.solana.com) but plan for configurable endpoints
- Implement retry logic for transient RPC failures
- Handle rate limiting with exponential backoff

### Caching Strategy
- Implement caching layer to reduce RPC calls (consider Redis or in-memory cache)
- Cache wallet data with TTL (Time To Live) appropriate for use case
- Consider cache invalidation strategies

### Database Schema
- Store wallet address (primary key or unique index)
- Store SOL balance (numeric/decimal type)
- Store transaction count (integer)
- Include timestamps (created_at, updated_at) for cache management
- Consider indexing strategy for efficient lookups

### Error Handling
- Validate Solana addresses before RPC calls (base58 format, correct length)
- Handle RPC timeout/network errors gracefully
- Return appropriate HTTP status codes (400 for invalid addresses, 503 for RPC unavailability, 500 for database errors)
- Log errors with sufficient context for debugging

## Environment Variables

Expected environment variables:
- `DATABASE_URL`: PostgreSQL connection string (for Prisma)
- `SOLANA_RPC_URL`: Solana RPC endpoint URL (optional, with sensible default)
- `PORT`: API server port (optional, default 3000)
- `CACHE_TTL`: Cache time-to-live in seconds (optional)