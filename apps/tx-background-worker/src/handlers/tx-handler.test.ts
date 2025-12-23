import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTxReq, getTx } from './tx-handler.js';
import { prisma } from '../config/db.js';
import { LAMPORTS_PER_SOL } from '../types/sol.js';
import type { MessageBroker } from '../messaging/message-broker.js';
import { InMemBroker } from '../messaging/in-mem-broker.js';

describe('Transaction Handler', () => {
    let broker: MessageBroker;
    const TEST_SENDER = 'EaVH8qHv7FLrhzVNYJRM8B8eXFKvKKvSCJvzLbmKgSqf'; // Valid Solana address
    const TEST_RECIPIENT = 'J3dxNj7nDRRqRRXuEMynDG57DkZK4jYRuv3Garmb1i99'; // Valid Solana address
    const INITIAL_BALANCE = BigInt(100 * LAMPORTS_PER_SOL); // 100 SOL

    beforeEach(async () => {
        broker = new InMemBroker();

        // Clean up test data
        await prwisma.transaction.deleteMany({});
        await prisma.wallet.deleteMany({});

        // Create test sender wallet with initial balance
        await prisma.wallet.create({
            data: {
                address: TEST_SENDER,
                balance: INITIAL_BALANCE,
            }
        });

        // Create test recipient wallet
        await prisma.wallet.create({
            data: {
                address: TEST_RECIPIENT,
                balance: 0n,
            }
        });
    });

    afterEach(async () => {
        // Clean up after tests
        await prisma.transaction.deleteMany({});
        await prisma.wallet.deleteMany({});
    });

    describe('Transaction Creation Validation', () => {
        it('should successfully create transaction with sufficient balance', async () => {
            const result = await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: 10, // 10 SOL
                },
                broker,
            });

            expect(result.id).toBeDefined();
            expect(typeof result.id).toBe('string');

            // Verify transaction was created in database
            const tx = await getTx(result.id);
            expect(tx).toBeDefined();
            expect(tx.senderAddress).toBe(TEST_SENDER);
            expect(tx.recipientAddress).toBe(TEST_RECIPIENT);
            expect(tx.amount).toBe(BigInt(10 * LAMPORTS_PER_SOL));
            expect(tx.state).toBe('PENDING');
        });

        it('should reject transaction when wallet not found', async () => {
            const NONEXISTENT_ADDRESS = 'BrG44HdsEhzapvs8bEqzvkq4egwevS3fRE6ze2ENo6S8';

            await expect(
                createTxReq({
                    req: {
                        senderAddress: NONEXISTENT_ADDRESS,
                        recipientAddress: TEST_RECIPIENT,
                        amount: 10,
                    },
                    broker,
                })
            ).rejects.toThrow('Sender wallet not found');
        });

        it('should reject transaction with insufficient balance', async () => {
            // Sender has 100 SOL, try to send 150 SOL
            await expect(
                createTxReq({
                    req: {
                        senderAddress: TEST_SENDER,
                        recipientAddress: TEST_RECIPIENT,
                        amount: 150,
                    },
                    broker,
                })
            ).rejects.toThrow('Insufficient balance in sender wallet');
        });

        it('should reject transaction with exact balance + 1 lamport', async () => {
            // Edge case: User has exactly 100 SOL, try to send 100.000000001 SOL
            const exactBalance = Number(INITIAL_BALANCE / BigInt(LAMPORTS_PER_SOL));
            const slightlyMore = exactBalance + 0.000000001;

            await expect(
                createTxReq({
                    req: {
                        senderAddress: TEST_SENDER,
                        recipientAddress: TEST_RECIPIENT,
                        amount: slightlyMore,
                    },
                    broker,
                })
            ).rejects.toThrow('Insufficient balance in sender wallet');
        });

        it('should allow transaction with exact balance amount', async () => {
            // Send exactly 100 SOL (entire balance)
            const result = await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: 100,
                },
                broker,
            });

            expect(result.id).toBeDefined();

            // Verify balance is now 0
            const wallet = await prisma.wallet.findUnique({
                where: { address: TEST_SENDER }
            });
            expect(wallet?.balance).toBe(0n);
        });
    });

    describe('Balance Deduction', () => {
        it('should deduct balance when creating transaction', async () => {
            const amountToSend = 25; // 25 SOL

            await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: amountToSend,
                },
                broker,
            });

            // Verify balance was deducted
            const wallet = await prisma.wallet.findUnique({
                where: { address: TEST_SENDER }
            });

            const expectedBalance = INITIAL_BALANCE - BigInt(amountToSend * LAMPORTS_PER_SOL);
            expect(wallet?.balance).toBe(expectedBalance);
        });

        it('should allow multiple transactions until balance is exhausted', async () => {
            // Send 30 SOL
            await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: 30,
                },
                broker,
            });

            // Verify balance: 100 - 30 = 70 SOL
            let wallet = await prisma.wallet.findUnique({
                where: { address: TEST_SENDER }
            });
            expect(wallet?.balance).toBe(BigInt(70 * LAMPORTS_PER_SOL));

            // Send another 40 SOL
            await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: 40,
                },
                broker,
            });

            // Verify balance: 70 - 40 = 30 SOL
            wallet = await prisma.wallet.findUnique({
                where: { address: TEST_SENDER }
            });
            expect(wallet?.balance).toBe(BigInt(30 * LAMPORTS_PER_SOL));

            // Try to send 31 SOL (should fail - insufficient balance)
            await expect(
                createTxReq({
                    req: {
                        senderAddress: TEST_SENDER,
                        recipientAddress: TEST_RECIPIENT,
                        amount: 31,
                    },
                    broker,
                })
            ).rejects.toThrow('Insufficient balance in sender wallet');

            // Balance should still be 30 SOL (transaction failed, no deduction)
            wallet = await prisma.wallet.findUnique({
                where: { address: TEST_SENDER }
            });
            expect(wallet?.balance).toBe(BigInt(30 * LAMPORTS_PER_SOL));
        });

        it('should not deduct balance if transaction creation fails', async () => {
            const initialWallet = await prisma.wallet.findUnique({
                where: { address: TEST_SENDER }
            });

            // Try to send to invalid address (should fail validation before our handler)
            // Or try insufficient balance scenario
            try {
                await createTxReq({
                    req: {
                        senderAddress: TEST_SENDER,
                        recipientAddress: TEST_RECIPIENT,
                        amount: 150, // More than available
                    },
                    broker,
                });
            } catch (error) {
                // Expected to fail
            }

            // Verify balance unchanged
            const finalWallet = await prisma.wallet.findUnique({
                where: { address: TEST_SENDER }
            });
            expect(finalWallet?.balance).toBe(initialWallet?.balance);
        });
    });

    describe('Status Transitions', () => {
        it('should create transaction in PENDING state', async () => {
            const result = await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: 10,
                },
                broker,
            });

            const tx = await getTx(result.id);
            expect(tx.state).toBe('PENDING');
            expect(tx.signature).toBeNull();
            expect(tx.error).toBeNull();
        });

        it('should have proper timestamps', async () => {
            const beforeCreate = new Date();

            const result = await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: 10,
                },
                broker,
            });

            const afterCreate = new Date();
            const tx = await getTx(result.id);

            expect(tx.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
            expect(tx.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
            expect(tx.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
            expect(tx.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        });
    });

    describe('Double-Spending Prevention', () => {
        it('should prevent double-spending with sequential transactions', async () => {
            // Create wallet with only 60 SOL
            await prisma.wallet.update({
                where: { address: TEST_SENDER },
                data: { balance: BigInt(60 * LAMPORTS_PER_SOL) }
            });

            // First transaction: 50 SOL (should succeed)
            await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: 50,
                },
                broker,
            });

            // Second transaction: 20 SOL (should fail - only 10 SOL left)
            await expect(
                createTxReq({
                    req: {
                        senderAddress: TEST_SENDER,
                        recipientAddress: TEST_RECIPIENT,
                        amount: 20,
                    },
                    broker,
                })
            ).rejects.toThrow('Insufficient balance in sender wallet');
        });

        it('should handle concurrent transaction attempts safely', async () => {
            // Create wallet with only 60 SOL
            await prisma.wallet.update({
                where: { address: TEST_SENDER },
                data: { balance: BigInt(60 * LAMPORTS_PER_SOL) }
            });

            // Attempt two 40 SOL transactions concurrently
            // Only one should succeed due to transaction isolation
            const promises = [
                createTxReq({
                    req: {
                        senderAddress: TEST_SENDER,
                        recipientAddress: TEST_RECIPIENT,
                        amount: 40,
                    },
                    broker,
                }),
                createTxReq({
                    req: {
                        senderAddress: TEST_SENDER,
                        recipientAddress: TEST_RECIPIENT,
                        amount: 40,
                    },
                    broker,
                }),
            ];

            const results = await Promise.allSettled(promises);

            // One should succeed, one should fail
            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            expect(succeeded).toBe(1);
            expect(failed).toBe(1);

            // Final balance should be 20 SOL (60 - 40)
            const finalWallet = await prisma.wallet.findUnique({
                where: { address: TEST_SENDER }
            });
            expect(finalWallet?.balance).toBe(BigInt(20 * LAMPORTS_PER_SOL));
        });
    });

    describe('Edge Cases', () => {
        it('should handle minimum amount correctly', async () => {
            const minAmount = 0.001; // As per requirements

            const result = await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: minAmount + 0.000001, // Just above minimum
                },
                broker,
            });

            expect(result.id).toBeDefined();
        });

        it('should handle large amounts correctly', async () => {
            // Update wallet to have 1000 SOL
            await prisma.wallet.update({
                where: { address: TEST_SENDER },
                data: { balance: BigInt(1000 * LAMPORTS_PER_SOL) }
            });

            const result = await createTxReq({
                req: {
                    senderAddress: TEST_SENDER,
                    recipientAddress: TEST_RECIPIENT,
                    amount: 999.999999999, // Large amount
                },
                broker,
            });

            expect(result.id).toBeDefined();
        });
    });
});