interface TransactionStatus {
  confirmed: boolean;
  slot?: number;
  blockTime?: number;
}

class SolanaRPCMock {
  private checkCounts = new Map<string, number>();

  async getTransaction(signature: string): Promise<TransactionStatus | null> {
    const checkCount = (this.checkCounts.get(signature) || 0) + 1;
    this.checkCounts.set(signature, checkCount);

    // Use signature hash to deterministically assign behavior
    const hash = this.hashSignature(signature);
    const behavior = hash % 10;

    // 50% confirmed on first check (0-4)
    if (behavior <= 4) {
      return {
        confirmed: true,
        slot: Math.floor(Math.random() * 1000000) + 100000000,
        blockTime: Math.floor(Date.now() / 1000),
      };
    }

    // 30% confirmed on third check (5-7)
    if (behavior <= 7) {
      if (checkCount >= 3) {
        return {
          confirmed: true,
          slot: Math.floor(Math.random() * 1000000) + 100000000,
          blockTime: Math.floor(Date.now() / 1000),
        };
      }
      return null;
    }

    // 20% never confirmed (8-9)
    return null;
  }

  private hashSignature(signature: string): number {
    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
      const char = signature.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  reset(): void {
    this.checkCounts.clear();
  }
}

export const solanaRPC = new SolanaRPCMock();
export type { TransactionStatus };
