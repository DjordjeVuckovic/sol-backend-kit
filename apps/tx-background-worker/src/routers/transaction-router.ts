import express, { type Router } from "express";
import { validateBody, validateParams, validateQuery } from "../middleware/zod.js";
import { CreateTxReqSchema, GetTxParamsSchema } from "../types/tx.js";
import { createTxReq, getTx, getTxs } from "../handlers/tx-handler.js";
import { broker } from "@/messaging/factory.js";
import { z } from "zod";

const router: Router = express.Router()

router.post('/v1/transactions',
    validateBody(CreateTxReqSchema),
    async (req, res) => {
        const {id} = await createTxReq({
            req: req.body,
            broker: broker,
        })

        return res
            .status(201)
            .setHeader('Location', `/v1/transactions/${id}`)
            .json({message: 'Successfully created transaction request', id});
    })

router.get('/v1/transactions/:id',
    validateParams(z.object({
        id: z.uuid()
    })),
    async (req, res) => {
        const {id} = req.params;

        const tx = await getTx(id!)
        return res.status(200).json(tx);
    }
)

router.get('/v1/transactions',
    validateQuery(GetTxParamsSchema),
    async (req, res) => {
        const {limit, offset} = req.query;
        const txs = await getTxs({limit: +limit!, offset: +offset!});
        return res.status(200).json(txs);
    }
)
export default router;