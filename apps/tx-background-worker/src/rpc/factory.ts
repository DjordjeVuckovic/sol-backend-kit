import { MockSolanaRpc, type SolanaRpc } from "@/rpc/solana-rpc.js";
import { broker } from "@/messaging/factory.js";

const rpc: SolanaRpc = new MockSolanaRpc()

export { rpc };