import type { MessageBroker } from "@/messaging/message-broker.js";
import { InMemBroker } from "@/messaging/in-mem-broker.js";
import { txSubscribers, txStatusCheckerSubscriber } from "@/handlers/tx-subscribers.js";
import { TX_CREATED_TOPIC, TX_SIGNATURE_CREATED } from "@/messaging/message-registry.js";

const broker: MessageBroker = new InMemBroker();

broker.subscribe(TX_CREATED_TOPIC, txSubscribers)
broker.subscribe(TX_SIGNATURE_CREATED, txStatusCheckerSubscriber)

export {
    broker,
}