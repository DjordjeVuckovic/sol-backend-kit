import {z} from "zod";

export const envSchema = z.object({
    PORT: z.coerce.number().optional().default(3000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional().default('info'),
    NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
    DATABASE_URL: z.url().default('postgresql://postgres:postgres@localhost:54321/dev?schema=public'),
})

export const env = envSchema.parse(process.env)