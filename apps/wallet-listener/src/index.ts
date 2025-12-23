import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import { env } from "./config/env.js";
import { createRpcClient } from "./sol/rpc.factory.js";
import { WalletRpcConnector } from "./sol/wallet-rpc.connector.js";
import { handleWalletEvent } from "./handlers/signature-event.handler.js";
import walletRouter from './routers/wallet.router.js'
import { prisma } from "./config/prisma.js";
import { logger } from "./config/logger.js";
import { handleNoOp } from "./handlers/notification-event.handler.js";

const app = express();

app.use(express.json());

app.set("json replacer", (_key: string, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value
);

app.use(walletRouter);

// Error handling middleware (must be last)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({err, stack: err.stack}, 'Unhandled error');
    res.status(500).json({error: 'Internal server error'});
});

const rpcClient = createRpcClient();
const subscriber = new WalletRpcConnector(rpcClient, env.TRACKING_WALLETS);

const abortControllerBackground = new AbortController();
let subscriberPromise: Promise<void> | null = null;

const startBackgroundTasks = async (): Promise<void> => {
    subscriberPromise = subscriber.addNotificationsListener(abortControllerBackground.signal, handleNoOp);
    try {
        await subscriberPromise;
    } catch (err) {
        logger.error({err}, 'Error in background subscription');
    }
};

const fetchOfflineSignatures = async (): Promise<void> => {
    try {
        await subscriber.fetchSignatures(handleWalletEvent);
        logger.info('Offline transactions fetched');
    } catch (err) {
        logger.error({err}, 'Error fetching offline signatures');
    }
};

//noinspection JSIgnoredPromiseFromCall
startBackgroundTasks()
//noinspection JSIgnoredPromiseFromCall
fetchOfflineSignatures()

const server = app.listen(env.PORT, () => logger.info({port: env.PORT}, 'Server running'));

const shutdown = async (): Promise<void> => {
    logger.info('Shutdown initiated');

    try {
        server.close(() => {
            logger.info('HTTP server closed');
        });

        abortControllerBackground.abort();

        if (subscriberPromise) {
            await Promise.race([
                subscriberPromise,
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);
        }

        await prisma.$disconnect();
        logger.info('Database disconnected');
        process.exit(0);
    } catch (err) {
        logger.error({err}, 'Error during shutdown');
        process.exit(1);
    }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
