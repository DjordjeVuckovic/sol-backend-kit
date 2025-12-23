import {Job, Worker} from 'bullmq';
import {env} from '../config/env.js';
import {logger} from "../config/logger.js";
import {prisma} from "../config/db.js";
import {solanaRPC} from "../rpc/solana.js";
import {sendWebhookReq, type WebHookReq} from "../hooks/webhook-client.js";
import type {WebhookPayload} from "../types/webhook.js";
import {retry} from "../shared/resilience.js";

const connection = {
    host: new URL(env.REDIS_URL).hostname,
    port: parseInt(new URL(env.REDIS_URL).port),
};

async function processMonitorJob(job: Job) {
    logger.info(`Processing job: ${job.name} (ID: ${job.id})`);

    try {
        switch (job.name) {
            case 'check-transactions':
                await checkAllTransactions();
                break;

            default:
                logger.warn(`Unknown job type: ${job.name}`);
        }
    } catch (error) {
        logger.error({error}, 'Error processing monitor job');
        throw error;
    }
}

type WebhookApiRespSuccess = {
    success: true,
    webhook: WebHookReq<WebhookPayload>,
    response: Record<string, any>
}

type WebhookApiRespError = {
    success: false,
    webhook: WebHookReq<WebhookPayload>,
    error: Error | unknown
}

type WebhookApiResp = WebhookApiRespSuccess | WebhookApiRespError;

async function checkAllTransactions() {
    logger.info('Checking all pending transactions...');
    const sigMonitoring = await prisma.singatureMonitoring.findMany({
        where: {status: 'MONITORING'}
    });
    let webhooksToSend: WebHookReq<WebhookPayload>[] = [];

    for (const mr of sigMonitoring) {
        const status = await retry(() => solanaRPC.getTransaction(mr.signature));
        if (!status) {
            logger.info({
                signature: mr.signature
            }, 'Transaction not found on blockchain');
            continue;
        }

        logger.info({
            signature: mr.signature,
            confirmed: status.confirmed
        }, 'Transaction status checked');

        if (status.confirmed) {
            webhooksToSend.push({
                url: mr.webhookUrl,
                payload: {
                    signature: mr.signature,
                    status: 'CONFIRMED',
                }
            });
        }
    }
    const results = await Promise.allSettled(webhooksToSend.map(sendWebhookReq))


    const {succeeded, failed} = results.reduce<{succeeded: WebhookApiResp[], failed: WebhookApiResp[]}>((acc, curr, i) => {
        const hook = webhooksToSend[i]!;
        if(curr.status === 'fulfilled') {
            succeeded.push({
                success: true,
                webhook: hook,
                response: curr
            })
        } else {
            failed.push({
                success: false,
                webhook: hook,
                error: curr.reason
            })
        }
        return acc;
    }, {succeeded: [], failed: []})

    await prisma.singatureMonitoring.updateMany({
        where: {
            signature: {
                in: succeeded.map(s => s.webhook.payload.signature)
            }
        },
        data: {
            status: 'CONFIRMED',
            webhookSentAt: new Date()
        }
    });

    await prisma.singatureMonitoring.updateMany({
        where: {
            signature: {
                in: failed.map(f => f.webhook.payload.signature)
            }
        },
        data: {
            status: 'WEBHOOK_FAILED',
        }
    })
}

export const monitorWorker = new Worker('monitor-transactions', processMonitorJob, {
    connection,
    concurrency: 1, // Process one job at a time to avoid race conditions
    limiter: {
        max: 10,
        duration: 1000,
    },
});

// Event listeners
monitorWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
});

monitorWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
});

monitorWorker.on('error', (err) => {
    console.error('Worker error:', err);
});

export async function closeWorker() {
    await monitorWorker.close();
    console.log('Monitor worker closed');
}
