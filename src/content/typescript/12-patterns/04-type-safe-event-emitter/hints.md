Start with the helpers: `type EventArgs<Payload> = [Payload] extends [void] ? [] : [payload: Payload];` and a `Listener<Payload>` that uses it as a rest parameter.
---
Give every method its own `<K extends keyof Events>` and use `Events[K]` for the payload. Without a per-method type parameter the payloads collapse into a union.
---
Store listeners in a mapped type: `#listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};` and create sets lazily with `this.#listeners[event] ??= new Set()`.
---
For `once`, declare `const wrapper: Listener<Events[K]> = (...args) => { this.off(event, wrapper); listener(...args); };` and return `this.on(event, wrapper)`.
