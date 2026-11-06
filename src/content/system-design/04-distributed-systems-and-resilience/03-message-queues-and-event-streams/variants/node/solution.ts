export interface QueueOptions {
  visibilityTimeoutMs: number;
  maxReceives: number;
  now: () => number;
}

export interface QueueMessage {
  id: string;
  body: unknown;
  receiveCount: number;
}

export interface Queue {
  send(body: unknown): string;
  receive(): QueueMessage | undefined;
  ack(id: string): boolean;
  deadLetters(): QueueMessage[];
}

export interface IdempotentConsumer {
  handle(message: { id: string; body: unknown }): boolean;
}

interface StoredMessage extends QueueMessage {
  visibleAt: number;
}

export function createQueue({ visibilityTimeoutMs, maxReceives, now }: QueueOptions): Queue {
  const messages: StoredMessage[] = [];
  const dead: QueueMessage[] = [];
  let nextId = 1;

  function send(body: unknown): string {
    const id = `m${nextId++}`;
    messages.push({ id, body, receiveCount: 0, visibleAt: now() });
    return id;
  }

  function receive(): QueueMessage | undefined {
    const time = now();
    let index = messages.findIndex((message) => message.visibleAt <= time);
    while (index !== -1 && messages[index].receiveCount >= maxReceives) {
      const [expired] = messages.splice(index, 1);
      dead.push({ id: expired.id, body: expired.body, receiveCount: expired.receiveCount });
      index = messages.findIndex((message) => message.visibleAt <= time);
    }
    if (index === -1) {
      return undefined;
    }
    const message = messages[index];
    message.receiveCount += 1;
    message.visibleAt = time + visibilityTimeoutMs;
    return { id: message.id, body: message.body, receiveCount: message.receiveCount };
  }

  function ack(id: string): boolean {
    const index = messages.findIndex((message) => message.id === id);
    if (index === -1) {
      return false;
    }
    messages.splice(index, 1);
    return true;
  }

  return { send, receive, ack, deadLetters: () => [...dead] };
}

export function createIdempotentConsumer(handler: (body: unknown) => void): IdempotentConsumer {
  const processed = new Set<string>();

  function handle(message: { id: string; body: unknown }): boolean {
    if (processed.has(message.id)) {
      return false;
    }
    handler(message.body);
    processed.add(message.id);
    return true;
  }

  return { handle };
}

let time = 0;
const queue = createQueue({ visibilityTimeoutMs: 30_000, maxReceives: 3, now: () => time });
let charged = 0;
const consumer = createIdempotentConsumer(() => {
  charged += 1;
});
queue.send({ orderId: 42 });
const first = queue.receive()!;
consumer.handle(first);
time += 30_000;
const again = queue.receive()!;
console.log('redelivered:', again.id, 'receiveCount:', again.receiveCount, 'applied again:', consumer.handle(again));
console.log('acked:', queue.ack(again.id), 'charged:', charged);
