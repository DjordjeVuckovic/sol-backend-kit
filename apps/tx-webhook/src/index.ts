import express from 'express';
import {env} from "./config/env.js";
import {logger} from "./config/logger.js";
import {loggerMiddleware} from "./middlewares/logger.js";
import {errorHandler} from "./middlewares/error.js";
import monitoringRouter from './routes/monitoring-router.js';
import {setupMonitorJob} from './jobs/queue.js';
import './jobs/worker.js';

const app = express();

app.use(express.json());
app.use(loggerMiddleware)

app.use('/api', monitoringRouter);

app.get('/health', (_, res) => {
    res.status(200).send('OK');
})

app.use(errorHandler)

async function startServer() {
    await setupMonitorJob();
    logger.info('Background job scheduler initialized');

    app.listen(env.PORT, () => {
        logger.info(`🔥  Listening on ${env.PORT}`);
    });
}

startServer().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
});