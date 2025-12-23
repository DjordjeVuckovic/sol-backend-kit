import "dotenv/config";

import type {CreateTxReq} from "../types/tx.js";
import type { TxStatus } from "@/generated/prisma-client/enums.js";

type CreateTxOptions = {
    payload: CreateTxReq;
}

export interface SolanaRpc {
    // Simulates sending transaction (70% success rate)
    sendTransaction(from: string, to: string, amount: number):
        Promise<{ success: boolean; signature?: string; error?: string }>;

    // Simulates checking status (returns confirmed after 2-3 calls)
    getTransactionStatus(signature: string):
        Promise<{ status: TxStatus}>;
}

export class MockSolanaRpc implements SolanaRpc {
    private txStatusMap: Map<string, number> = new Map();

    async sendTransaction(from: string, to: string, amount: number):
        Promise<{ success: boolean; signature?: string; error?: string }> {
        // Simulate 70% success rate
        if (Math.random() < 0.7) {
            const signature = `mock_signature_${Math.random().toString(36).substring(2)}`;
            this.txStatusMap.set(signature, 0);
            return { success: true, signature };
        } else {
            return { success: false, error: "Simulated transaction failure" };
        }
    }

    async getTransactionStatus(signature: string):
        Promise<{ status: TxStatus}> {
        const count = this.txStatusMap.get(signature) ?? 0;
        if (count >= 2) {
            return { status: "COMPLETED"};
        } else {
            this.txStatusMap.set(signature, count + 1);
            return { status: "PENDING" };
        }
    }
}