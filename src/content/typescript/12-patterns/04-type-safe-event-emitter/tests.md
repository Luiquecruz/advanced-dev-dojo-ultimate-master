## type: Listeners receive the payload type of their event

```ts
appEvents.on('login', (payload) => {
  expectType<{ userId: number }>(payload);
});
appEvents.on('message', (text) => {
  expectType<string>(text);
  // @ts-expect-error
  text.userId;
});
```

## type: emit checks event names and payloads

```ts
appEvents.emit('login', { userId: 1 });
appEvents.emit('message', 'hello');
appEvents.emit('logout');
// @ts-expect-error
appEvents.emit('login', { userId: '1' });
// @ts-expect-error
appEvents.emit('signup', {});
// @ts-expect-error
appEvents.emit('message');
```

## type: on returns an unsubscribe function

```ts
const unsubscribe = appEvents.on('logout', () => {});
type _ = Expect<Equal<typeof unsubscribe, () => void>>;
```

## runtime: emit calls every listener of that event with the payload

```js
const emitter = new TypedEmitter();
const received = [];
emitter.on('message', (text) => received.push(`a:${text}`));
emitter.on('message', (text) => received.push(`b:${text}`));
emitter.on('login', () => received.push('login'));
emitter.emit('message', 'hi');
assert.deepEqual(received, ['a:hi', 'b:hi']);
```

## runtime: unsubscribe and once remove listeners

```js
const emitter = new TypedEmitter();
const calls = [];
const unsubscribe = emitter.on('message', (text) => calls.push(`on:${text}`));
emitter.once('message', (text) => calls.push(`once:${text}`));
emitter.emit('message', '1');
unsubscribe();
emitter.emit('message', '2');
assert.deepEqual(calls, ['on:1', 'once:1']);
assert.equal(emitter.listenerCount('message'), 0);
```

## forbid: Does not use any

```regex
\bany\b
```
