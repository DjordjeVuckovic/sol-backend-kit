export class Queue<T> {
    private queue: T[] = [];

    push(item: T) {
        this.queue.push(item);
    }
    pushAll(items: T[]) {
        this.queue.push(...items);
    }
    pop() {
        return this.queue.shift();
    }
    peek() {
        return this.queue[0];
    }
    isEmpty() {
        return this.queue.length === 0;
    }
    size() {
        return this.queue.length;
    }
}