export class HttpError extends Error {
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
    statusCode?: number;
    status?: number;
    expose?: boolean;
}