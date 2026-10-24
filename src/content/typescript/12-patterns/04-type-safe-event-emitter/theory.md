## Stringly typed events

Event emitters connect parts of an app that should not know about each other. The classic API is loosely typed: any string is an event name and any value is a payload.

```ts
emitter.on('user:login', (user: any) => greet(user.name));
emitter.emit('user:logn', { id: 1 }); // typo and wrong payload, both compile
```

Node's `EventEmitter`, the DOM's `addEventListener` for custom events and many pub/sub libraries started like this. We can do much better with three type-level tools you already know: `keyof`, indexed access types and generic methods.

## An event map

Describe every event and its payload in one object type:

```ts
type ChatEvents = {
  message: { from: string; text: string };
  typing: string;           // user name
  disconnect: void;         // no payload
};
```

The emitter is generic over that map. Each method has its own type parameter `K` constrained to the map's keys, so the payload type is looked up per call:

```ts
class Emitter<Events extends Record<string, unknown>> {
  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void) { /* ... */ }
  emit<K extends keyof Events>(event: K, payload: Events[K]) { /* ... */ }
}

const chat = new Emitter<ChatEvents>();
chat.on('message', (payload) => payload.text); // payload: { from: string; text: string }
chat.emit('typing', 42); // Error: number is not assignable to string
```

When you call `emit('typing', ...)`, TypeScript infers `K` as the literal `'typing'`, and `Events[K]` becomes `string`. Autocomplete lists the valid event names.

## Optional payloads with tuple rest parameters

`emit('disconnect', undefined)` is awkward. A conditional type can turn the payload into a **parameter list**:

```ts
type EventArgs<Payload> = [Payload] extends [void] ? [] : [payload: Payload];

emit<K extends keyof Events>(event: K, ...args: EventArgs<Events[K]>): void;

chat.emit('disconnect');      // OK
chat.emit('typing', 'Ada');   // OK
chat.emit('typing');          // Error: expected 2 arguments
```

Wrapping both sides in `[...]` stops the conditional type from distributing over unions, so a `string | number` payload stays one parameter.

## Storing listeners

Inside the class you need one set of listeners per event. A mapped type keeps the link between each key and its listener type:

```ts
#listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};
```

Writing `this.#listeners[event] ??= new Set()` with a generic `K` type checks, and reading returns `Set<Listener<Events[K]>> | undefined`, with no `any` and no casts.

## Unsubscribing

Returning an unsubscribe function from `on` avoids having to keep a reference to the listener just to remove it later. It composes well with framework cleanup (`useEffect` cleanup, `DestroyRef.onDestroy`, `onScopeDispose`):

```ts
const stop = chat.on('typing', showIndicator);
stop();
```

`once` registers a wrapper that removes itself before calling the real listener. Iterate over a **copy** of the listener set in `emit`, otherwise listeners removing themselves while you loop can skip others.

## Interfaces vs type aliases as event maps

A `Record<string, unknown>` constraint requires an implicit index signature. Object **type aliases** have one; **interfaces** do not, because they can be augmented later. `new Emitter<ChatEventsInterface>()` therefore fails with "Index signature for type 'string' is missing". Either declare the map with `type`, or relax the constraint to `Events extends object`.

## In the ecosystem

- Node's `EventEmitter` became generic in `@types/node` (`new EventEmitter<{ data: [Buffer] }>()`), using tuples of arguments per event.
- `mitt` and `nanoevents` offer tiny typed emitters with the same event-map idea.
- The DOM uses `WindowEventMap`, `HTMLElementEventMap` and friends: `addEventListener<K extends keyof WindowEventMap>(type: K, listener: (ev: WindowEventMap[K]) => any)` is exactly this pattern.

## Pitfalls

- `on(event: keyof Events, listener: (payload: Events[keyof Events]) => void)` without a type parameter loses the link: every payload becomes the union of all payloads.
- Forgetting to unsubscribe leaks listeners and, with them, everything their closures capture.
