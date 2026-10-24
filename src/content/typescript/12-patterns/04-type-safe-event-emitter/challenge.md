`TypedEmitter` works at runtime but accepts any event name and any payload. Make it type safe without `any`.

1. Add `EventArgs<Payload>`: `[]` when the payload is `void`, otherwise `[payload: Payload]`. Add `Listener<Payload> = (...args: EventArgs<Payload>) => void`.
2. Make the class generic: `TypedEmitter<Events extends Record<string, unknown>>`. Every method takes a key `K extends keyof Events`:
   - `on(event, listener): () => void` registers a listener and returns an unsubscribe function
   - `once(event, listener): () => void` registers a listener that removes itself before its first call
   - `off(event, listener): void`
   - `emit(event, ...args: EventArgs<Events[K]>): void`
   - `listenerCount(event): number`
3. Create `appEvents` as `new TypedEmitter<AppEvents>()`.

```ts
appEvents.emit('login', { userId: 1 }); // OK
appEvents.emit('logout');               // OK: void payload, no argument
appEvents.emit('login', { userId: '1' }); // Error
appEvents.emit('signup', {});           // Error: unknown event
```
