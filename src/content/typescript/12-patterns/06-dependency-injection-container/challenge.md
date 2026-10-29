The `Container` works but returns `unknown` from `resolve`, so `createContainer` needs casts, a typo in a key only fails at runtime, and every `resolve` builds a new instance. Make it a **typed dependency injection container**.

1. Add the helper types:
   - `Resolver<Services> = <K extends keyof Services>(key: K) => Services[K]`
   - `Factory<Services, T> = (resolve: Resolver<Services>) => T`
   - `NewKey<K extends string, Services>`: `never` when `K` is already a key of `Services`, otherwise `K`
2. Make the class `Container<Services extends object = {}>`:
   - `register<K extends string, T>(key: NewKey<K, Services>, factory: Factory<Services, T>, options?: { lifetime?: Lifetime })` returns a **new** `Container<Services & { [P in K]: T }>`; the original container is unchanged.
   - The factory's `resolve` only knows the services registered **before** it, so dependencies must be registered first and cycles cannot be written.
   - `resolve<K extends keyof Services>(key: K): Services[K]`.
3. Runtime rules:
   - `'singleton'` (default): the factory runs on the first `resolve`, never at `register`, and the same instance is returned afterwards. Containers created from the same chain share singletons.
   - `'transient'`: the factory runs on every `resolve`.
   - Registering an existing key throws `Error('Service "<key>" is already registered')`; resolving an unknown key throws `Error('Service "<key>" is not registered')`.
4. Remove the casts from `createContainer`: `signup` is transient, `clock` and `logger` are singletons.

```ts
const container = createContainer();
container.resolve('signup');   // SignupService
container.resolve('mailer');   // Error: not a key of the services map
new Container().register('reader', (resolve) => resolve('clock')); // Error: clock is not registered yet
```

No `any`. Casts to `Services[K]` are acceptable only inside `resolve`, where the untyped registry meets the typed API.
