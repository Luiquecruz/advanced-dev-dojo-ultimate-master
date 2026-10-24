const { of, throwError, concat, Observable } = require('rxjs');

test('collect() resolves with every value when the source completes', async () => {
  await expect(mod.collect(of(1, 2, 3))).resolves.toEqual([1, 2, 3]);
  const late = new Observable((subscriber) => {
    setTimeout(() => {
      subscriber.next('a');
      subscriber.complete();
    }, 10);
  });
  await expect(mod.collect(late)).resolves.toEqual(['a']);
});

test('collect() rejects with the source error', async () => {
  const failing = concat(of(1), throwError(() => new Error('boom')));
  await expect(mod.collect(failing)).rejects.toHaveProperty('message', 'boom');
});

test('countdown(3, 10) emits 3, 2, 1, 0 and completes', async () => {
  expect(mod.countdown(3, 10)).toBeInstanceOf(Observable);
  await expect(mod.collect(mod.countdown(3, 10))).resolves.toEqual([3, 2, 1, 0]);
});

test('countdown() is lazy: no timer starts before subscribe', () => {
  const original = globalThis.setInterval;
  const spy = fn((...args) => original(...args));
  globalThis.setInterval = spy;
  try {
    const stream = mod.countdown(5, 10);
    expect(spy).not.toHaveBeenCalled();
    const subscription = stream.subscribe(() => {});
    expect(spy).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  } finally {
    globalThis.setInterval = original;
  }
});

test('unsubscribing early stops emissions (teardown clears the interval)', async () => {
  const values = [];
  const subscription = mod.countdown(10, 10).subscribe((value) => values.push(value));
  await sleep(25);
  subscription.unsubscribe();
  const seen = values.length;
  await sleep(60);
  expect(seen).toBeGreaterThan(0);
  expect(values.length).toBe(seen);
});
