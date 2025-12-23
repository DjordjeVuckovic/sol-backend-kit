import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string(),
    SOLANA_RPC_URL: z.string().default('https://api.devnet.solana.com'),
    SOLANA_WS_URL: z.string().default('wss://api.devnet.solana.com'),
    CACHE_TTL: z.string().default('300'),
    TRACKING_WALLETS: z.preprocess(
        (val) => {
            if (!val) return [];
            if(typeof val === 'string') {
                return val.trim().split(',').map(x => x.trim());
            }
            return []
        },
        z.array(z.string())
    )
});

const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Environment validation failed:');
            console.error(error.message);
            process.exit(1);
        }
        throw error;
    }
};

export const env = parseEnv();