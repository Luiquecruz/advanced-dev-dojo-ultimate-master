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

export function createQueue({ visibilityTimeoutMs, maxReceives, now }: QueueOptions): Queue {
  const messages: QueueMessage[] = [];
  let nextId = 1;

  function send(body: unknown): string {
    const id = `m${nextId++}`;
    messages.push({ id, body, receiveCount: 0 });
    return id;
  }

  function receive(): QueueMessage | undefined {
    // TODO: keep the message in the queue, hide it until now() + visibilityTimeoutMs and count the receive
    // TODO: move a message already received maxReceives times to the dead letters instead of delivering it
    const message = messages.shift();
    return message === undefined ? undefined : { ...message, receiveCount: 1 };
  }

  function ack(id: string): boolean {
    // TODO: delete the message for good and report whether it was still in the queue
    return messages.some((message) => message.id === id);
  }

  // TODO: return the messages moved to the dead letters, in the order they were moved
  return { send, receive, ack, deadLetters: () => [] };
}

export function createIdempotentConsumer(handler: (body: unknown) => void): IdempotentConsumer {
  function handle(message: { id: string; body: unknown }): boolean {
    // TODO: run the handler only once per message id, and only record the id when the handler succeeds
    handler(message.body);
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
const first = queue.receive();
if (first) {
  consumer.handle(first);
}
time += 30_000;
const again = queue.receive();
console.log('redelivered:', again?.id, 'receiveCount:', again?.receiveCount, 'applied again:', again ? consumer.handle(again) : false);
console.log('acked:', again ? queue.ack(again.id) : false, 'charged:', charged);
