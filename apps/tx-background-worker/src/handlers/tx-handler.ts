import type { CreateTxReq, GetTxParams } from "../types/tx.js";
import type { MessageBroker } from "../messaging/message-broker.js";
import { logger } from "../config/logger.js";
import { TX_CREATED_TOPIC } from "../messaging/message-registry.js";
import { prisma } from "../config/db.js";
import { LAMPORTS_PER_SOL } from "../types/sol.js";
import { HttpError } from "@/shared/error.js";

type CreateTxParams = {
    req: CreateTxReq,
    broker: MessageBroker
}

export async function createTxReq({
                                      req,
                                      broker
                                  }: CreateTxParams) {
    logger.info({
        event: 'tx.create.request',
        sender: req.senderAddress,
        recipient: req.recipientAddress,
        amount: req.amount,
    }, 'Creating tx req');

    try {
        const {id} =  await createDbTx(req);
        void broker.publish(TX_CREATED_TOPIC, {
            payload: {
                ...req,
                id,
            }
        })
        return {id};
    } catch (e) {
        logger.error({
            event: 'tx.create.error',
            err: e,
        }, 'Error creating tx');
        throw new Error('Failed to create tx request');
    }
}

async function createDbTx(req: CreateTxReq) {
    return prisma.$transaction(
        async (tx) => {
            const wallet = await tx.wallet.findUnique({
                where: {
                    address: req.senderAddress,
                }
            })

            if (!wallet) {
                logger.error({
                    event: 'tx.create.error',
                    sender: req.senderAddress,
                }, 'Sender wallet not found');
                throw new HttpError(400, 'Sender wallet not found');
            }

            if (wallet.balance < req.amount * LAMPORTS_PER_SOL) {
                logger.error({
                    event: 'tx.create.error',
                    sender: req.senderAddress,
                    balance: wallet.balance,
                    required: req.amount * LAMPORTS_PER_SOL,
                }, 'Insufficient balance in sender wallet');
                throw new HttpError(400, 'Insufficient balance in sender wallet');
            }
            const {id} = await prisma.transaction.create({
                data: {
                    senderAddress: req.senderAddress,
                    recipientAddress: req.recipientAddress,
                    amount: req.amount * LAMPORTS_PER_SOL,
                }
            });

            await tx.wallet.update({
                where: { address: req.senderAddress },
                data: { balance: { decrement: req.amount * LAMPORTS_PER_SOL } }
            });

            return {id};
        },
    )
}

export async function getTx(id: string) {
    const tx = await prisma.transaction.findUnique({
        where: {
            id,
        }
    });
    if(!tx) {
        logger.error({
            event: 'tx.get.error',
            txId: id,
        }, 'Transaction not found');
        throw new HttpError(404,'Transaction not found');
    }
    return tx;
}

export async function getTxs(params: GetTxParams) {
    const {limit, offset} = params;
    return prisma.transaction.findMany({
        skip: offset,
        take: limit,
    });
}