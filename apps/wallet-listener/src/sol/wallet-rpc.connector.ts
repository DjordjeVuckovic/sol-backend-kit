import { type Address, isAddress } from "@solana/kit";
import type { RpcClient } from "./rpc.factory.js";
import type { NotificationEventHandler, WalletEventHandler } from "../types/wallet.js";
import { logger } from "../config/logger.js";

export class WalletRpcConnector {
    private readonly wallets: Address[];
    private readonly client: RpcClient;

    constructor(rpcSubscriber: RpcClient, addresses: string[]) {
        this.wallets = addresses.filter(x => isAddress(x));
        this.client = rpcSubscriber;

        if (this.wallets.length !== addresses.length) {
            logger.warn({
                total: addresses.length,
                valid: this.wallets.length
            }, 'Some addresses were invalid and filtered out');
        }
    }

    async addNotificationsListener(abortSig: AbortSignal, handler: NotificationEventHandler): Promise<void> {
        for (const wallet of this.wallets) {
            try {
                const notifications = await this.client.rpcSubscriptions
                    .accountNotifications(wallet, {
                        commitment: 'confirmed'
                    })
                    .subscribe({
                        abortSignal: abortSig,
                    });

                for await (const notification of notifications) {
                    logger.debug({wallet, notification}, 'Account notification received');

                    const {context, value} = notification;
                    await handler({
                        value: {
                            executable: value.executable ?? false,
                            lamports: value.lamports,
                            owner: value.owner,
                            slot: context.slot, space: 0n
                        },
                        wallet: wallet
                    })
                }
            } catch (err) {
                if (abortSig.aborted) {
                    logger.info({wallet}, 'Subscription aborted');
                    return;
                }
                logger.error({err, wallet}, 'Error in notification listener');
                throw err;
            }
        }
    }

    async fetchSignatures(handler: WalletEventHandler): Promise<void> {
        if (this.wallets.length === 0) {
            logger.info('No wallets to fetch signatures for');
            return;
        }

        for (const wallet of this.wallets) {
            try {
                const solSigs = await this.client.rpc.getSignaturesForAddress(wallet, {}).send();
                await handler({
                    sigs: solSigs.map(x => ({
                        blockTime: x.blockTime?.valueOf() ?? null,
                        signature: x.signature,
                        slot: x.slot
                    })),
                    wallet: wallet
                });
            } catch (err) {
                logger.error({err, wallet}, 'Error fetching signatures for wallet');
            }
        }
    }
}