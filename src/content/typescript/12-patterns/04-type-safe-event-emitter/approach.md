1. Declare `EventArgs<Payload>` with a non-distributive conditional type and `Listener<Payload>` as a function of those args.
2. Add the `Events extends Record<string, unknown>` type parameter to the class.
3. Replace the `Map<string, ...>` with a mapped type keyed by `keyof Events`.
4. Rewrite `on`, `off`, `emit` and `listenerCount` with `<K extends keyof Events>` and `Events[K]` payloads; `emit` takes `...args: EventArgs<Events[K]>` and spreads them into each listener.
5. Implement `once` with a self-removing wrapper.
6. Instantiate `appEvents` with `new TypedEmitter<AppEvents>()` and remove every `any`.
