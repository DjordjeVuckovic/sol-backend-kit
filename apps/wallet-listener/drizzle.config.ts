import type { Config } from "drizzle-kit";

export default {
    schema: [
        "./src/config/schema.ts",
    ],
    out: "./src/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5430/solana_wallet?schema=public"
    },
} satisfies Config;
