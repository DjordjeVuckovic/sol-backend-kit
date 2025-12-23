import type { MessageHandler } from "@/messaging/message-broker.js";
import { logger } from "@/config/logger.js";
import { rpc } from "@/rpc/factory.js";
import { prisma } from "@/config/db.js";
import type { TxStatus } from "@/generated/prisma-client/enums.js";
import type { Transaction } from "@/generated/prisma-client/client.js";
import { TX_CREATED_TOPIC, TX_SIGNATURE_CREATED } from "@/messaging/message-registry.js";
import { broker } from "@/messaging/factory.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;


export const txSubscribers: MessageHandler<typeof TX_CREATED_TOPIC> = async (message) => {
    const {payload} = message;
    logger.info({
        sender: payload.senderAddress,
        recipient: payload.recipientAddress,
        amount: payload.amount,
        event: 'tx.subscriber.received'
    }, 'Received tx created event');

    if (!payload.id) {
        logger.error({
            event: 'tx.subscriber.error',
        }, 'Transaction ID is missing in the payload');
        return;
    }

    let success = false;
    let signature;
    try {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            logger.info({
                event: 'tx.subscriber.attempt',
                attempt
            }, `Attempt ${attempt} to process transaction ${payload.id}`);

            const result = await rpc.sendTransaction(
                payload.senderAddress,
                payload.recipientAddress,
                payload.amount
            );

            if (result.success && result.signature) {
                logger.info({
                    event: 'tx.subscriber.success',
                    signature: result.signature
                }, `Transaction ${payload.id} processed successfully with signature ${result.signature}`);
                success = true;
                signature = result.signature;
                break;
            }
            logger.warn({
                event: 'tx.subscriber.failure',
                error: result.error
            }, `Transaction ${payload.id} failed on attempt ${attempt}: ${result.error}`);

            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }

        if (!success) {
            logger.error({
                event: 'tx.subscriber.failed',
            }, `Failed to process transaction ${payload.id} after 3 attempts`);
        }
    } catch (err) {
        logger.error({
            event: 'tx.subscriber.error',
            err
        }, 'Error processing tx created event');
    }

    if (!success) {
        await patchTransaction({
            txId: payload.id,
            status: 'FAILED',
            error: 'Failed to process transaction after maximum retries'
        })
        return;
    }
    await patchTransaction({
        txId: payload.id,
        status: 'PROCESSING',
        signature: signature,
    });

    await broker.publish(TX_SIGNATURE_CREATED, {
        payload: {
            txId: payload.id,
            signature: signature!,
        }
    })

};

export const txStatusCheckerSubscriber: MessageHandler<typeof TX_SIGNATURE_CREATED> = async (message) => {
    const {payload} = message;
    const {txId, signature} = payload;

    logger.info({
        event: 'tx.signature.subscriber.received',
        txId,
        signature
    }, `Received tx signature created event for transaction ${txId}`);

    const pollIntervalMs = 1000;
    const maxPollAttempts = 5;
    let attempts = 0;
    let status: TxStatus | null = null;

    while (attempts < maxPollAttempts) {
        attempts++;
        try {
            const statusResult = await rpc.getTransactionStatus(signature);
            logger.info({
                event: 'tx.signature.subscriber.poll',
                txId,
                attempt: attempts,
                status: statusResult.status
            }, `Polling attempt ${attempts} for transaction ${txId}: status ${statusResult.status}`);

            if (statusResult.status === 'COMPLETED' || statusResult.status === 'FAILED') {
                status = statusResult.status;
                break;
            }
        } catch (err) {
            logger.error({
                event: 'tx.signature.subscriber.poll_error',
                txId,
                attempt: attempts,
                err
            }, `Error polling status for transaction ${txId} on attempt ${attempts}`);
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    if(!status) {
        logger.error({
            event: 'tx.signature.subscriber.timeout',
            txId
        }, `Timeout polling status for transaction ${txId} after ${maxPollAttempts} attempts`);
        status = 'FAILED';
    }

    await patchTransaction({
        txId,
        status,
        signature,
    });
    logger.info({
        event: 'tx.signature.subscriber.completed',
        txId
    }, `Transaction ${txId} completed successfully`);

}


async function patchTransaction({
                                           txId,
                                           status,
                                           signature,
                                           error
                                       }: {
                                           txId: string;
                                           status: TxStatus;
                                           signature?: string;
                                           error?: string;
                                       }
) {
    const updateData: Partial<Transaction> = {
        state: status
    };
    if (signature) {
        updateData.signature = signature;
    }

    if (error) {
        updateData.error = error;
    }

    await prisma.$transaction(
        async (tx) => {
        try {
            const transaction = await tx.transaction.update({
                where: {id: txId},
                data: updateData,
            });

            if(transaction.state === 'FAILED') {
                await tx.wallet.update({
                    where: { address: transaction.senderAddress },
                    data: { balance: { increment: transaction.amount } }
                })
            }
        } catch (err) {
            logger.error({
                event: 'tx.subscriber.update_error',
                err
            }, `Error updating transaction ${txId} status to ${status}`);
        }
    })

}