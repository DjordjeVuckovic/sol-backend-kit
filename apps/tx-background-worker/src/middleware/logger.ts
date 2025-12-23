import type {NextFunction, Response, Request} from "express";
import {logger} from "../config/logger.js";

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    const requestInfo = {
        method: req.method,
        url: req.url,
        path: req.path,
        userAgent: req.get('user-agent'),
        ip: req.ip || req.socket.remoteAddress,
    };

    logger.info(requestInfo, 'Incoming request');

    const logResponse = () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        const responseInfo = {
            ...requestInfo,
            statusCode,
            duration,
        };

        if (statusCode >= 500) {
            logger.error(responseInfo, 'Request completed with server error');
        } else if (statusCode >= 400) {
            logger.warn(responseInfo, 'Request completed with client error');
        } else {
            logger.info(responseInfo, 'Request completed successfully');
        }
    };

    res.on('finish', logResponse);
    res.on('close', () => {
        if (!res.writableEnded) {
            const duration = Date.now() - startTime;
            logger.warn({
                ...requestInfo,
                duration,
            }, 'Request closed before response finished');
        }
    });

    next();
}