import {z} from "zod";

export const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url().default("postgresql://postgres:postgres@localhost:54322/dev"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    REDIS_URL: z.url().default("redis://localhost:6380"),
})

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);