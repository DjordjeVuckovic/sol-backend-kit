import type { Envelop, MessageBroker, MessageHandler } from "@/messaging/message-broker.js";
import type { MessageName, MessageRegistry } from "@/messaging/message-registry.js";
import { Queue } from 'bullmq';
import { env } from "@/config/env.js";

export class BullMessageBroker implements MessageBroker {
    private readonly queues: Map<MessageName, Queue>;
    constructor(queues: MessageName[]) {
        const redisUrl = new URL(env.REDIS_URL)
        const conn = {
            host: redisUrl.host,
            port: +redisUrl.port,
        }
        this.queues = new Map(queues.map(q => {
            return [q, new Queue('tx.created', {
                connection: {
                    ...conn
                }
            })] satisfies [MessageName, Queue];
        }))

    }

    publish<T extends MessageName>(name: T, msg: Envelop<MessageRegistry[T]>): Promise<void> | void {
        this.queues.get(name)?.add(name, msg);
    }

    subscribe<T extends MessageName>(name: T, handler: MessageHandler<T>): () => void {
        const queue = this.queues.get(name);
        if (!queue) {
            throw new Error(`Queue for message ${name} not found`);
        }
        void queue.add(
            name,
            async (job: { data: Envelop<MessageRegistry[T]>; }) => {
                await handler(job.data as Envelop<MessageRegistry[T]>);
            }
        )
        return function () {
            void queue.remove(name)
        };
    }

    close(): Promise<void> | void {
        this.queues.forEach(async (queue) => {
            await queue.drain()
            await queue.close()
        });
    }

}