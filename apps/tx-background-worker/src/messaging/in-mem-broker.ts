import type { Envelop, MessageBroker, MessageHandler } from "@/messaging/message-broker.js";
import {logger} from "@/config/logger.js";
import type { MessageName, MessageRegistry } from "@/messaging/message-registry.js";

export class InMemBroker implements MessageBroker {
    private subs = new Map<string, Set<MessageHandler<any>>>();

    async publish<T extends MessageName>(name: T, msg: Envelop<MessageRegistry[T]>): Promise<void> {
        const subs = this.subs.get(name)
        if (!subs || subs.size === 0) {
            return
        }

        await Promise.allSettled(
            Array.from(subs).map(async (handler) => {
                try {
                    await handler(msg)
                } catch (err) {
                    logger.error({ err, topic: name }, 'Error handling message in InMemBroker');
                }
            })
        )
    }

    subscribe<T extends MessageName>(name: T, handler: MessageHandler<any>): () => void {
        if (!this.subs.has(name)) {
            this.subs.set(name, new Set<MessageHandler<any>>())
        }

        const handlers = this.subs.get(name)!
        handlers.add(handler)

        return () => {
            handlers.delete(handler)
            if (handlers.size === 0) {
                this.subs.delete(name)
            }
        }
    }

    close(): Promise<void> | void {
        this.subs.clear();
    }
}
