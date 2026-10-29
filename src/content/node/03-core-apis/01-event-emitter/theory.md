# The EventEmitter

`EventEmitter` from `node:events` is the publish/subscribe primitive behind most of Node: HTTP servers emit `'request'`, streams emit `'data'` and `'end'`, `process` emits `'SIGTERM'`. If you know `addEventListener` in the browser, you already know the idea; the API and two sharp edges are different.

## The basics

```ts
import { EventEmitter } from 'node:events';

const bus = new EventEmitter();

bus.on('signup', (email: string) => console.log('welcome', email));
bus.once('signup', () => console.log('first signup ever'));

bus.emit('signup', 'ada@example.com');
bus.emit('signup', 'alan@example.com');
```

| Browser `EventTarget` | Node `EventEmitter` |
| --- | --- |
| `addEventListener(type, fn)` | `on(name, fn)` / `addListener` |
| `removeEventListener(type, fn)` | `off(name, fn)` / `removeListener` |
| `{ once: true }` | `once(name, fn)` |
| `dispatchEvent(new Event(type))` | `emit(name, ...args)` returns `true` if anyone listened |
| event object with `target`, `preventDefault` | plain arguments, no bubbling, no default action |

`emit` is **synchronous**: every listener runs, in registration order, before `emit` returns. An emitter is not a queue and not async by itself; a slow listener blocks the code that emitted.

## Subclassing and typing

The common pattern is a domain class that extends `EventEmitter`. Since `@types/node` 20, the class is generic, so the event map is checked at compile time:

```ts
interface CheckoutEvents {
  paid: [payment: { orderId: string; amount: number }];
  error: [error: Error];
}

class Checkout extends EventEmitter<CheckoutEvents> {
  pay(orderId: string, amount: number) {
    this.emit('paid', { orderId, amount });
  }
}
```

Each key maps to the tuple of listener arguments, so `checkout.on('paid', (payment) => ...)` knows `payment.amount` is a number and `emit('paid', 'oops')` is a type error.

## The `'error'` event is special

If an emitter emits `'error'` and **nobody listens**, Node throws the error. In a server that usually means the process crashes:

```ts
const checkout = new Checkout();
checkout.emit('error', new Error('Card declined'));
```

Every long-lived emitter you own (a stream, a socket, a client library) needs an `'error'` listener, or must be wrapped in an API that turns errors into rejected promises. This is the number one review item for event-based code.

## Leaks and unsubscribing

Listeners keep their closures alive. Registering a listener per request on a shared emitter, without removing it, grows memory forever. Node warns after 10 listeners for the same event (`MaxListenersExceededWarning`); treat the warning as a bug report, not something to silence with `setMaxListeners(0)`.

A clean pattern is to return an unsubscribe function, exactly like a React effect cleanup:

```ts
function onPaid(checkout: Checkout, listener: (payment: Payment) => void) {
  checkout.on('paid', listener);
  return () => checkout.off('paid', listener);
}
```

`off` needs the **same function reference**: an inline arrow passed to `on` can never be removed.

## Bridging to promises

`once(emitter, name)` from `node:events` returns a promise that resolves with the array of arguments of the next event, and **rejects if `'error'` is emitted first**:

```ts
import { once } from 'node:events';

const [payment] = await once(checkout, 'paid');
```

`on(emitter, name)` returns an async iterator for `for await` loops. Both accept `{ signal }` so you can stop waiting with an `AbortController`.

## Legacy vs modern

Older code wraps emitters in hand-written `new Promise((resolve, reject) => { e.once('x', resolve); e.once('error', reject); })` and forgets to remove the other listener. Prefer `events.once` / `events.on`, typed `EventEmitter<Events>`, and, for code that also runs in browsers or edge runtimes, `EventTarget`, which Node supports natively.

## When to choose it

Use an emitter when one producer notifies **many independent, in-process** consumers and the producer does not care about their results: lifecycle hooks, progress, domain events inside a module. Choose something else when:

- you need a single result: return a promise;
- you need a sequence of values with backpressure: use a stream or an async iterator;
- consumers live in other processes or must survive a crash: use a queue (Redis, SQS, a database outbox); an in-memory emitter loses every event on restart;
- the code must run in browsers and Node alike: `EventTarget`.

## Working with AI

Ask for "a typed `EventEmitter<Events>` with an event map", and state who listens and whether events must survive restarts. Review the result for:

- an `'error'` listener on every emitter the code creates or receives;
- listeners added per request or per connection that are never removed (look for `on` without a matching `off`, or `once`);
- `async` listeners: `emit` ignores the returned promise, so a rejection becomes an unhandled rejection unless the listener catches it;
- `setMaxListeners(0)` used to silence a leak warning;
- an in-memory emitter used where a durable queue is required.
