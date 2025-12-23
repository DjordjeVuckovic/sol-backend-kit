import type { NextFunction, Response, Request } from "express";
import { createChildLogger } from "../config/logger.js";
import type { HttpError } from "@/shared/error.js";

export const errorHandler = (err: HttpError, req: Request, res: Response, next: NextFunction) => {
    const log = createChildLogger({route: req.path});

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || err.status || 500;

    if (statusCode >= 500) {
        log.error({err, statusCode}, 'Server error occurred');
    } else if (statusCode >= 400) {
        log.warn({err, statusCode}, 'Client error occurred');
    }

    const errorResponse: any = {
        error: err.message || 'Internal Server Error',
    };

    if (statusCode < 500 || err.expose) {
        errorResponse.details = err.message;
    }

    return res
        .header('Content-Type', 'application/json')
        .status(statusCode)
        .json(errorResponse);
};