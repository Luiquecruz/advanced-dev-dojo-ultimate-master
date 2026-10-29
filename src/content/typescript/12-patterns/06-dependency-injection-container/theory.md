# Typed Dependency Injection Container

**Dependency injection (DI)** means a class receives its collaborators instead of creating them: `new SignupService(clock, logger)` rather than `new SystemClock()` inside the constructor. Tests pass fakes, production passes real implementations, and the class never knows the difference. Angular is built on DI; on the server, NestJS, InversifyJS, tsyringe and Awilix provide containers.

A **container** is the registry that knows how to build each service and wires dependencies for you. The classic problem: containers are stringly typed. `container.resolve('signup')` returns `unknown` (or `any`), a misspelled key fails at runtime, and a missing registration is found only when the code path runs.

This lesson builds a container where the **services map is a type** that grows with each registration.

## Manual DI first

```ts
const clock = new SystemClock();
const logger = new ConsoleLogger();
const signup = new SignupService(clock, logger);
```

Wiring by hand in one function (the **composition root**) is perfectly good DI and is fully typed. A container earns its place when the graph is large, when lifetimes differ (one database pool, a new unit of work per request), or when modules register their own services.

## A services map that grows

Model the registry as a type parameter: an object type from key to service type.

```ts
class Container<Services extends object = {}> {
  register<K extends string, T>(key: K, factory: Factory<Services, T>): Container<Services & { [P in K]: T }>;
  resolve<K extends keyof Services>(key: K): Services[K];
}
```

Each `register` returns a container whose map has one more key. After `.register('clock', () => new SystemClock())` the type is `Container<{ clock: SystemClock }>`, so `resolve('clock')` is a `SystemClock` and `resolve('mailer')` does not compile. This is the same idea as the type-state builder: state lives in a type parameter and each step returns a new type.

Because the type changes, `register` must return a **new** container (or at least a value with the new type). Returning `this` from a mutated container leaves the original variable with an outdated type.

## Factories see only earlier services

```ts
type Resolver<Services> = <K extends keyof Services>(key: K) => Services[K];
type Factory<Services, T> = (resolve: Resolver<Services>) => T;
```

The factory receives a resolver typed with the map **as it was before this registration**. Two guarantees follow for free: a dependency must be registered before its consumer, and a cycle (`a` needs `b`, `b` needs `a`) cannot be expressed. Runtime containers detect these at startup; here the compiler rejects them.

## Rejecting duplicate keys

```ts
type NewKey<K extends string, Services> = K extends keyof Services ? never : K;

register<K extends string, T>(key: NewKey<K, Services>, factory: Factory<Services, T>)
```

TypeScript still infers `K` from the argument, then the parameter type becomes `never` when the key exists, so `register('clock', ...)` twice is a compile error. Keep a runtime check too: JavaScript callers and casts bypass types.

## Lifetimes

| Lifetime | Behavior | Typical use |
| --- | --- | --- |
| Singleton | created on first `resolve`, then cached | configuration, connection pools, clients, loggers |
| Transient | created on every `resolve` | lightweight stateful objects, per-call helpers |
| Scoped | one instance per scope (per request) | units of work, request context; needs child containers |

Create singletons **lazily**: building everything at `register` time forces registration order to match construction order and creates services nobody uses.

## Where the cast goes

The registry stores heterogeneous factories, so internally it is `Map<string, Registration>` with `unknown` values. The type safety comes from the public signatures; a controlled cast to `Services[K]` inside `resolve` connects the two worlds. This is normal for typed registries (event emitters, caches, DI): keep the unsafe part tiny, private and tested.

## Decorator-based containers

NestJS, Angular, InversifyJS and tsyringe use decorators (`@Injectable()`, `@Inject()`) to describe dependencies. The Node.js containers among them read constructor parameter types at runtime through `emitDecoratorMetadata`, which needs legacy `experimentalDecorators` and a compiler that emits metadata; type-stripping runners (Node's built-in TypeScript support, esbuild without plugins) do not. Function-based containers like the one here, Awilix or plain composition roots need neither.

## When to choose it

Start with **manual wiring in a composition root**: it is explicit, typed and enough for most services. Introduce a container when the graph is large, lifetimes matter (singletons vs per-request scopes), or plugins register services dynamically. Choose a framework container when you adopt its framework (Angular, NestJS). Avoid the **service locator** anti-pattern: passing the container into business classes so they call `resolve` themselves hides dependencies and makes tests harder; resolve at the edges, inject into constructors.

## Working with AI

Ask for "constructor injection with a composition root" before asking for a container, and state the lifetimes you need. Review generated code for: `container.resolve` calls inside domain classes (service locator), `any` in the container API, singletons that hold request data (user, transaction) and leak between requests, eager construction at registration, missing duplicate-key checks, and decorator metadata that will not survive your build tool.
