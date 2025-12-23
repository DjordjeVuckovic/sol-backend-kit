import { type Signatures } from '../generated/prisma/client.js'
import type { Address, Lamports, Slot } from "@solana/kit";
export type Sig = Omit<Signatures, 'createdAt' | 'updatedAt' | 'deletedAt' | 'id' | 'walletId'>

export type WalletEventHandlerParams = {
    sigs: Sig[],
    wallet: Address
}

export type WalletEventHandler = (params: WalletEventHandlerParams) => Promise<void>


export type NotificationEvent = {
    wallet: Address,
    value: {
        slot: Slot,
        executable: boolean
        lamports: Lamports
        owner: Address
        space: bigint
    }
}
export type NotificationEventHandler = (event: NotificationEvent) => Promise<void>;