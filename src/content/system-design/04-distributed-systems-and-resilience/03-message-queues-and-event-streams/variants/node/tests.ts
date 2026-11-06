test('send returns m1, m2, ... and receive delivers visible messages in send order, hiding each one it delivers', () => {
  let time = 0;
  const queue = mod.createQueue({ visibilityTimeoutMs: 1_000, maxReceives: 5, now: () => time });
  expect(queue.send('a')).toBe('m1');
  expect(queue.send('b')).toBe('m2');
  expect(queue.receive()).toEqual({ id: 'm1', body: 'a', receiveCount: 1 });
  expect(queue.receive()).toEqual({ id: 'm2', body: 'b', receiveCount: 1 });
  expect(queue.receive()).toBeUndefined();
  time = 1_000;
  expect(queue.receive()).toEqual({ id: 'm1', body: 'a', receiveCount: 2 });
  expect(queue.receive()).toEqual({ id: 'm2', body: 'b', receiveCount: 2 });
});

// beginner mistake: assuming exactly-once delivery, so a crash before ack applies the effect twice (or the message is deleted on receive and lost)
test('an un-acked message is delivered again after the visibility timeout and the idempotent consumer applies it once', () => {
  let time = 0;
  const queue = mod.createQueue({ visibilityTimeoutMs: 30_000, maxReceives: 5, now: () => time });
  const charge = fn();
  const consumer = mod.createIdempotentConsumer(charge);
  queue.send({ orderId: 42 });
  const first = queue.receive();
  expect(consumer.handle(first)).toBe(true);
  time = 29_999;
  expect(queue.receive()).toBeUndefined();
  time = 30_000;
  const again = queue.receive();
  expect(again).toEqual({ id: first.id, body: { orderId: 42 }, receiveCount: 2 });
  expect(consumer.handle(again)).toBe(false);
  expect(charge).toHaveBeenCalledTimes(1);
  expect(charge).toHaveBeenCalledWith({ orderId: 42 });
});

test('ack deletes a message for good and returns false when it is no longer in the queue', () => {
  let time = 0;
  const queue = mod.createQueue({ visibilityTimeoutMs: 100, maxReceives: 1, now: () => time });
  const id = queue.send('job');
  queue.receive();
  expect(queue.ack(id)).toBe(true);
  expect(queue.ack(id)).toBe(false);
  expect(queue.ack('m99')).toBe(false);
  time = 1_000;
  expect(queue.receive()).toBeUndefined();
  expect(queue.deadLetters()).toEqual([]);
});

test('a message received the maximum number of times without an ack moves to the dead letters and the next message is delivered', () => {
  let time = 0;
  const queue = mod.createQueue({ visibilityTimeoutMs: 100, maxReceives: 2, now: () => time });
  queue.send('poison');
  expect(queue.receive().receiveCount).toBe(1);
  time = 100;
  expect(queue.receive().receiveCount).toBe(2);
  queue.send('healthy');
  time = 200;
  expect(queue.receive()).toEqual({ id: 'm2', body: 'healthy', receiveCount: 1 });
  expect(queue.deadLetters()).toEqual([{ id: 'm1', body: 'poison', receiveCount: 2 }]);
  expect(queue.ack('m1')).toBe(false);
});

test('the idempotent consumer records an id only after the handler succeeds', () => {
  const seen: unknown[] = [];
  let fail = true;
  const consumer = mod.createIdempotentConsumer((body) => {
    if (fail) {
      throw new Error('database unavailable');
    }
    seen.push(body);
  });
  expect(() => consumer.handle({ id: 'm1', body: 'a' })).toThrow('database unavailable');
  fail = false;
  expect(consumer.handle({ id: 'm1', body: 'a' })).toBe(true);
  expect(consumer.handle({ id: 'm2', body: 'b' })).toBe(true);
  expect(consumer.handle({ id: 'm1', body: 'a' })).toBe(false);
  expect(seen).toEqual(['a', 'b']);
});
