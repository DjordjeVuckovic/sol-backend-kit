export class HttpError extends Error {
    public readonly statusCode: number;
    public readonly expose: boolean;

    constructor(statusCode: number, message: string, expose: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.expose = expose;

        // Maintains proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}