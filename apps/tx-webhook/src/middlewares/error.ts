import type { NextFunction, Response, Request } from "express";
import {createChildLogger, logger} from "../config/logger.js";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error({
        err: err
    }, err.message || 'Failed to process req')
    const log = createChildLogger({route: req.path});

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = (err as any).statusCode || (err as any).status || 500;

    if (statusCode >= 500) {
        log.error({err, statusCode}, 'Server error occurred');
    } else if (statusCode >= 400) {
        log.warn({err, statusCode}, 'Client error occurred');
    }

    const errorResponse: any = {
        error: err.message || 'Internal Server Error',
    };

    return res
        .header('Content-Type', 'application/json')
        .status(statusCode)
        .json(errorResponse);
};