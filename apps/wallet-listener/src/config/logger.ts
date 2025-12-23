import pino from 'pino';
import { env } from './env.js';

const isDev = env.NODE_ENV !== 'production';

export const logger = isDev
    ? pino({
        level: 'debug',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname'
            }
        }
    })
    : pino({
        level: 'info'
    });