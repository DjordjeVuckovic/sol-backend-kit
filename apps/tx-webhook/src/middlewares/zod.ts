import type {Request, Response, NextFunction} from "express";
import {z} from "zod";

function validateBody<T extends z.ZodTypeAny>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({
                    error: 'Invalid request body',
                    details: err.issues
                });
            } else {
                res.status(500).json({
                    error: 'Validation error',
                    details: err
                });
            }
        }
    }
}

function validateQuery<T extends z.ZodTypeAny>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.query = schema.parse(req.query) as typeof req.query;
            next();
        } catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({
                    error: 'Invalid query parameters',
                    details: err.issues
                });
            } else {
                res.status(500).json({
                    error: 'Validation error',
                    details: err
                });
            }
        }
    }
}

function validateParams<T extends z.ZodTypeAny>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.params = schema.parse(req.params) as typeof req.params;
            next();
        } catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({
                    error: 'Invalid route parameters',
                    details: err.issues
                });
            } else {
                res.status(500).json({
                    error: 'Validation error',
                    details: err
                });
            }
        }
    }
}

export { validateBody, validateQuery, validateParams };