import type { Envelop, MessageBroker, MessageHandler } from "@/messaging/message-broker.js";
import type { MessageName, MessageRegistry } from "@/messaging/message-registry.js";
import Bull from 'bull';

export class BullMessageBroker implements MessageBroker {

    publish<T extends MessageName>(name: T, msg: Envelop<MessageRegistry[T]>): Promise<void> | void {

    }

    subscribe<T extends MessageName>(name: T, handler: MessageHandler<T>): () => void {
        const subQueue = new Bull(name, 'redis://127.0.0.1:6380');
        return function () {

        };
    }

    close(): Promise<void> | void {
        return undefined;
    }

}