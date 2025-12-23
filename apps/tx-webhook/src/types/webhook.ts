import {z} from "zod";
import bs58 from "bs58";
export const CreateTxWebhookSchema = z.object({
    url: z.url(),
    signature: z.string().refine((val) => {
        try {
            const decoded = bs58.decode(val);
            // Solana transaction signatures are exactly 64 bytes
            return decoded.length === 64;
        }
        catch (e) {
            return false;
        }
    }, {
        message: 'Invalid Solana transaction signature (must be 64-byte base58-encoded string)'
    })
});

export type CreateTxWebhook = z.infer<typeof CreateTxWebhookSchema>;

export type WebhookPayload = { signature: string, status: string }
