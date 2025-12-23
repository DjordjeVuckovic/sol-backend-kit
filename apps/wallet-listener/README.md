## API Development & Integration

- Scenario: Build a small service that fetches user wallet data from a Solana RPC endpoint and stores it in a PostgreSQL database.

- Node.js + Express API design.

- Prisma usage for database interactions.

- Error handling and logging.

- Clear communication about your thought process.

- Using async/await effectively, handling rate limits if interacting with Solana RPC.

Create an endpoint: GET /wallet/:address
- Fetch the SOL balance and transaction count for the given address from Solana RPC.
- Store the result in PostgreSQL using Prisma.
- Return the stored record as JSON.
- Discuss caching options to avoid hitting RPC too often.