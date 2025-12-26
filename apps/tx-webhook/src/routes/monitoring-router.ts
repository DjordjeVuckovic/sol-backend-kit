import express, {type Request, type Response, type Router} from "express";
import {validateBody, validateParams} from "../middlewares/zod.js";
import {type CreateTxWebhook, CreateTxWebhookSchema} from "../types/webhook.js";
import {prisma} from "../config/db.js";
import {monitorQueue} from "../jobs/queue.js";
import {logger} from "../config/logger.js";
import {
    PrismaClientKnownRequestError,
    type SingatureMonitoringModel
} from "../generated/prisma/internal/prismaNamespace.js";
import {HttpError} from "../shared/error.js";
import {z} from "zod";

const router: Router = express.Router();

router.post('/v1/monitor',
    validateBody(CreateTxWebhookSchema),
    async (req: Request<{}, {}, CreateTxWebhook>, res: Response<SingatureMonitoringModel>) => {
        const reqBody = req.body;
        const result = await monitorHandler(reqBody);
        return res.status(201).json(result);
    })

router.get('/v1/monitor/:id',
    validateParams(z.object({
            id: z.coerce.number()
    })),
    async (req: Request<{id: string}>, res) => {
        const {id} = req.params;
        const monitor = await prisma.singatureMonitoring.findUnique({
            where: {
                id: +id
            }
        });
        if (!monitor) {
            throw new HttpError(404, 'Monitor not found');
        }
        return res.status(200).json(monitor);
    }
)

async function monitorHandler(req: CreateTxWebhook) {
    const {url, signature} = req;

    try {
        const monitor = await prisma.singatureMonitoring.create({
            data: {
                webhookUrl: url,
                signature
            }
        });
        await monitorQueue.add('process-monitor', {
            monitorId: monitor.id,
            signature,
            webhookUrl: url
        });

        return monitor;
    } catch (err: unknown) {
        logger.error({
            err
        }, 'Failed to create monitor');
        if (err instanceof PrismaClientKnownRequestError) {
            if (err.code === 'P2002') {
                throw new HttpError(409, 'Same signature already exists');
            }
        }
        throw err;
    }
}

export default router;