Write the helpers first: `type Resolver<Services> = <K extends keyof Services>(key: K) => Services[K];`, `type Factory<Services, T> = (resolve: Resolver<Services>) => T;` and `type NewKey<K extends string, Services> = K extends keyof Services ? never : K;`.
---
Keep an untyped registry inside (`Map<string, Registration>` with `create: () => unknown`, a `lifetime` and an optional cached `instance`). The constructor receives that map, so `register` can copy it into a new container: `return new Container(registrations)` with the return type `Container<Services & { [P in K]: T }>`.
---
In `register`, throw when the key exists, then `registrations.set(key, { lifetime: options.lifetime ?? 'singleton', create: () => factory((dependency) => this.resolve(dependency)) })`. Using `this.resolve` gives the factory exactly the services registered before it.
---
`resolve` throws for unknown keys, returns `registration.create() as Services[K]` for transients, and for singletons uses `registration.instance ??= { value: registration.create() }`. Registration objects are shared by the copied maps, so every container of the chain shares the same singleton.
