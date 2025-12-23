import {logger} from "./src/config/logger.js";

type Node<T> = {
    value: T;
    left: Node<T> | null;
    right: Node<T> | null;
};

const tree = {
    value: 1,
    left: {
        value: 2,
        left: {
            value: 4,
            left: null,
            right: null
        },
        right: {
            value: 5,
            left: null,
            right: null
        }
    },
    right: {
        value: 3,
        left: {
            value: 6,
            left: null,
            right: null
        },
        right: {
            value: 7,
            left: null,
            right: null
        }
    }
}

const dfs = <T>(node: Node<T> | null, result: T[] = []): T[] => {
    if (!node) return result;
    result.push(node.value);

    dfs(node.left, result);
    dfs(node.right, result);

    return result;
}

console.log(dfs(tree))

function dfsIterative<T>(root: Node<T>): T[] {
    if (!root) return [];

    const result: T[] = [];
    const stack: Node<T>[] = [root]

    while (stack.length > 0) {
        const node = stack.pop()!
        result.push(node?.value)
        if (node?.right) {
            stack.push(node.right);
        }
        if (node?.left) {
            stack.push(node.left);
        }
    }

    return result;
}

console.log(dfsIterative(tree))


function bfs<T>(root: Node<T> | null, depth = 0, results: T[] = []): T[] {
    if (!root) return [];
    const queue: Node<T>[] = [root]
    while (queue.length > 0) {
        const node = queue.shift()!;
        results.push(node?.value);
        console.log(node.value)
        console.log(depth)
        if (node.left) {
            queue.push(node.left)
        }
        if (node.right) {
            queue.push(node.right)
        }
    }
    return results;
}

console.log(bfs(tree))

const DEFAULT_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY = 30_000;
const DEFAULT_RETRIES = 2;

type Options = {
    retries: number
    delayMs: number
    maxDelay?: number
    backoff?: 'exponential' | undefined
}

function retry<T, Params>(fn: (...args: Params[]) => Promise<T>, opts?: Options) {
    return async (...args: any[]): Promise<T> => {
        const {retries, delayMs, maxDelay, backoff}: Options = {
            retries: DEFAULT_RETRIES,
            delayMs: DEFAULT_DELAY_MS,
            maxDelay: DEFAULT_MAX_DELAY,
            ...opts
        };
        try {
            await fn(...args);
        } catch (e) {
            logger.error({
                err: e,
            }, 'Function failed, retrying...');
            for (let attempt = 1; attempt <= retries; attempt++) {
                let currentDelay = backoff !== 'exponential'
                    ? delayMs
                    : Math.min(delayMs * Math.pow(2, attempt - 1), maxDelay!);

                logger.info(`Waiting for ${currentDelay}ms before retrying...`);
                await new Promise((resolve) => setTimeout(resolve, currentDelay));
            }
        }
        throw new Error('Retry failed')
    }
}