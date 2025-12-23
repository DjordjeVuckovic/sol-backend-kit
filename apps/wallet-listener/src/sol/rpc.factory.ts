import {
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    type Rpc,
    type RpcSubscriptions,
    type SolanaRpcApi,
    type SolanaRpcSubscriptionsApi
} from "@solana/kit";
import { env } from "../config/env.js";


export type RpcClient = {
    rpc: Rpc<SolanaRpcApi>;
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
};

export const createRpcClient = (): RpcClient => ({
    rpc: createSolanaRpc(env.SOLANA_RPC_URL),
    rpcSubscriptions: createSolanaRpcSubscriptions(env.SOLANA_WS_URL, {
        intervalMs: 5000
    })
})