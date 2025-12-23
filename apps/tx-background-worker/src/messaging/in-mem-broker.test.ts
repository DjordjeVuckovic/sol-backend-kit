import { describe, it, expect, beforeEach } from '@jest/globals';
import {InMemBroker} from "./in-mem-broker.js";
import type { MessageBroker } from "@/messaging/message-broker.js";

describe('InMemBroker', () => {
    beforeEach(() => {
    })

    it('init', () => {
        const broker = new InMemBroker()
        expect(broker).toBeInstanceOf(InMemBroker)
    })
    it('one subscriber', async () => {
        const broker: MessageBroker = new InMemBroker()
        let receivedMessage: any = null;

        broker.subscribe('test', (message) => {
            receivedMessage = message.payload
        })

        await broker.publish('test', {payload: {foo: 'bar'}})
        expect(receivedMessage).toEqual({foo: 'bar'})
    });

    it('multiple subscribers', async () => {
        const broker: MessageBroker = new InMemBroker()
        let receivedMessages: any[] = [];

        broker.subscribe('test', (message) => {
            receivedMessages.push(message.payload)
        })
        broker.subscribe('test', (message) => {
            receivedMessages.push(message.payload)
        })

        await broker.publish('test', {payload: {foo: 'baz'}})
        expect(receivedMessages).toEqual([{foo: 'baz'}, {foo: 'baz'}])
    })

    it('unsubscribe removes handler', async () => {
        const broker: MessageBroker = new InMemBroker()
        let count = 0
        const unsubscribe = broker.subscribe('test', () => {
            count++
        })

        await broker.publish('test', {payload: 'msg1'})
        expect(count).toBe(1)

        unsubscribe()
        await broker.publish('test', {payload: 'msg2'})
        expect(count).toBe(1) // Should still be 1
    })

    it('handles errors in subscribers without affecting others', async () => {
        const broker: MessageBroker = new InMemBroker()
        const results: string[] = []

        broker.subscribe('test', async () => {
            throw new Error('Handler 1 failed')
        })
        broker.subscribe('test', async (msg) => {
            results.push('handler2')
        })
        broker.subscribe('test', async (msg) => {
            results.push('handler3')
        })

        await broker.publish('test', {payload: 'test-msg'})

        // Both non-failing handlers should execute
        expect(results).toContain('handler2')
        expect(results).toContain('handler3')
    })

    it('processes multiple messages in order', async () => {
        const broker: MessageBroker = new InMemBroker()
        const received: any[] = []

        broker.subscribe('test', async (msg) => {
            received.push(msg.payload)
        })

        await broker.publish('test', {payload: 1})
        await broker.publish('test', {payload: 2})
        await broker.publish('test', {payload: 3})

        expect(received).toEqual([1, 2, 3])
    })

    it('drops messages when no subscribers exist', async () => {
        const broker: MessageBroker = new InMemBroker()

        // Should not throw - just drops the message
        await expect(broker.publish('test', {payload: 'msg'})).resolves.toBeUndefined()
    })
});