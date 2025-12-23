import {z} from "zod";
import {solAddress} from "./sol.js";

const MIN_AMOUNT = 0.001;

export const CreateTxReqSchema = z.object({
    senderAddress: solAddress,
    recipientAddress: solAddress,
    amount: z.number().refine((a => {
        return a > MIN_AMOUNT;
    }), {
        message: `Amount must be greater than ${MIN_AMOUNT} SOL`,
    }),
});

export type CreateTxReq = z.infer<typeof CreateTxReqSchema>;

export const GetTxParamsSchema = z.object({
    limit: z.coerce.number().default(100).optional(),
    offset: z.coerce.number().default(0).optional(),
});

export type GetTxParams = z.infer<typeof GetTxParamsSchema>;