import {logger} from "../config/logger.js";

export const DEFAULT_RETRIES = 3;
export const DEFAULT_DELAY_MS = 1000;
export const DEFAULT_MAX_DELAY = 30_000;

export type RetryOptions = {
    retries?: number;
    delayMs?: number;
    maxDelay?: number;
    backoff?: 'fixed' | 'exponential';
    jitter?: boolean;
}

export const retry = async <T>(fn: () => Promise<T>, opts?: RetryOptions) => {
    const {retries, delayMs, maxDelay, backoff}: RetryOptions = {
        retries: DEFAULT_RETRIES,
        delayMs: DEFAULT_DELAY_MS,
        maxDelay: DEFAULT_MAX_DELAY,
        ...opts
    };
    try {
        return await fn();
    } catch (e) {
        logger.error({
            err: e,
        }, 'Function failed, retrying...');
        for (let attempt = 1; attempt <= retries; attempt++) {
            let currentDelay = backoff !== 'exponential'
                ? delayMs
                : Math.min(delayMs * Math.pow(2, attempt - 1), maxDelay!);

            logger.info(`Waiting for ${currentDelay}ms before retrying...`);
            await wait(currentDelay);
        }
    }
    throw new Error(`Retry failed after ${retries} attempts.`);
}

export const wait = (ms: number) => new Promise(
    (resolve) => setTimeout(resolve, ms)
);
