import express from 'express'
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error.js";
import { broker } from "@/messaging/factory.js";
import { prisma } from "@/config/db.js";
import transactionRouter from "@/routers/transaction-router.js";
import helmet from "helmet";


const app = express()

app.use(express.urlencoded({
    extended: true
}))
app.use(express.json())
app.set("json replacer", (_key: string, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value
);
app.use(helmet());

// Apply middlewares
app.use(loggerMiddleware)

// Mount routers
app.get('/health', (_, res) => {
    return res.json({status: 'ok', timestamp: new Date().toISOString()});
});

app.use('/api', transactionRouter);

app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
})
// Error handling middleware (must be last!)
app.use(errorHandler);

const server = app.listen(
    env.PORT,
    () => {
        logger.info({
            port: env.PORT,
            env: env.NODE_ENV,
            logLevel: logger.level,
            nodeVersion: process.version,
        }, '🔥 Server started successfully');
    }
)

const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30_000;

async function shutdown() {
    logger.info({
        event: 'server.shutdown.initiated',
    }, 'Shutdown initiated');

    const forceTimeout = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);

    try {

        await Promise.allSettled([
            prisma.$disconnect(),
            broker.close?.()
        ]);

        logger.debug('Closing HTTP server');
        server.close(() => {
            clearTimeout(forceTimeout);
            logger.info('Server closed gracefully');
        });
    } catch (err) {
        clearTimeout(forceTimeout);
        logger.fatal({err}, 'Error during shutdown');
        process.exit(1);
    }
}

// process.on('SIGTERM', () => shutdown);
// process.on('SIGINT', () => shutdown);