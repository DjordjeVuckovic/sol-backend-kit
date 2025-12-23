import pino from 'pino';
import { env } from './env.js';

const isDevelopment = env.NODE_ENV !== 'production';

export const createChildLogger = (context: Record<string, any>) => {
    return logger.child(context)
}

export const logger = pino({
    level: env.LOG_LEVEL,

    base: {
        service: 'wallet-mock-service',
        version: '1.0.0',
    },

    transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                singleLine: false,
            },
        }
        : undefined,

    timestamp: pino.stdTimeFunctions.isoTime,

    redact: {
        paths: ['req.headers.authorization', '*.apiKey', '*.password'],
        remove: true,
    },

    serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
    },

    formatters: {
        level: (label) => {
            return { level: label }
        },
    },
})
// Export typed logger
export type Logger = typeof logger;
