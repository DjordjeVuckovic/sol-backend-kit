import type { NotificationEventHandler } from "../types/wallet.js";
import { logger } from "../config/logger.js";

export const handleNoOp: NotificationEventHandler = (event) => {
    logger.info({...event}, 'Processing notification')
    return Promise.resolve();
}