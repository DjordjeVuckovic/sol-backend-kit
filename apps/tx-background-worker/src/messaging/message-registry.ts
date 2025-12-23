import type { CreateTxReq } from "@/types/tx.js";

export const TX_CREATED_TOPIC = "tx.created" as const;
export const TX_SIGNATURE_CREATED = "tx.signature.created" as const;

export type MessageRegistry = {
    [TX_CREATED_TOPIC]: TxCreatedEvent & { id: string };
    [TX_SIGNATURE_CREATED]: { signature: string; txId: string };
}
export type MessageName = keyof MessageRegistry;

export type TxCreatedEvent  = CreateTxReq

