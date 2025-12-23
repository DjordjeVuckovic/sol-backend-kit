import type { MessageName, MessageRegistry } from "@/messaging/message-registry.js";

export type MessageHandler<T extends MessageName> = (message: Envelop<MessageRegistry[T]>) => Promise<void> | void;
export type Envelop<T> = {
    payload: T;
}
export interface MessageBroker {
    publish<T extends MessageName>(name: T, msg: Envelop<MessageRegistry[T]>): Promise<void> | void;
    subscribe<T extends MessageName>(name: T, handler: MessageHandler<T>): () => void;
    // Generic overloads for testing (more permissive)
    publish<T = unknown>(
        name: string,
        msg: Envelop<T>
    ): Promise<void> | void;
    subscribe<T = unknown>(
        name: string,
        handler: (message: Envelop<T>) => Promise<void> | void
    ): () => void;
    close?(): Promise<void> | void;
}