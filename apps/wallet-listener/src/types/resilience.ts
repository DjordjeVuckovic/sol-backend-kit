import { logger } from "../config/logger.js";

type RetryOptions = {
    max?: number;
    exponentialFactor?: number;
    delayMs?: number;
    maxDelayMs?: number;
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function retry<T>(
    fn: () => Promise<T>,
    {
        max = 3,
        exponentialFactor = 2,
        delayMs = 1000,
        maxDelayMs = 30_000,
    }: RetryOptions = {},
): Promise<T> {
    let lastErr: unknown;

    for (let attempt = 1; attempt <= max; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const isLast = attempt === max;
            if(isLast) {
                logger.error({ err, attempt }, 'Error during retry');
                return Promise.reject(err);
            }

            const delay = Math.min(maxDelayMs, Math.random() * (delayMs * exponentialFactor ** (attempt - 1)));
            logger.warn({ err: lastErr, attempt, delay }, 'Retrying...');

            await sleep(delay);
        }
    }
    return Promise.reject(lastErr);
}
