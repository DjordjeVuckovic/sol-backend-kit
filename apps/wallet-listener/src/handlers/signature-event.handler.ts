import type { WalletEventHandler } from "../types/wallet.js";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";

export const handleWalletEvent: WalletEventHandler = async (params) => {
    const { wallet, sigs } = params;
    logger.info(
        {
            walletAddress: wallet,
            signatureCount: sigs.length,
            operation: 'wallet_event_handler'
        },
        'Processing wallet event in tx...'
    );

    return prisma.$transaction(
        async (tx) => {
            const dbWallet = await tx.wallet.findFirst({
                where: {
                    solAddress: wallet,
                }
            });

            if (!dbWallet) {
                const newWallet = await tx.wallet.create({
                    data: {
                        solAddress: wallet,
                        signatures: {
                            createMany: {
                                data: sigs
                            }
                        }
                    }
                });
                logger.info({walletId: newWallet.id, address: wallet, sigCount: sigs.length}, 'New wallet created');
                return;
            }

            const sigsToExclude = await tx.signatures.findMany({
                where: {
                    signature: {in: sigs.map(s => s.signature)}
                },
                select: {
                    signature: true
                }
            });

            const excludedSignatures = new Set(sigsToExclude.map(s => s.signature));

            const sigsForInsert = sigs
                .filter(x => !excludedSignatures.has(x.signature))
                .map(x => ({
                    ...x,
                    walletId: dbWallet.id
                }));

            if (sigsForInsert.length > 0) {
                await tx.signatures.createMany({
                    data: sigsForInsert,
                });
                logger.info({walletId: dbWallet.id, newSigCount: sigsForInsert.length}, 'Added new signatures');
            }
        },
        {
            isolationLevel: 'ReadCommitted',
        }
    );
};