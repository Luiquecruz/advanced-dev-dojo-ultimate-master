# Dependency Injection

A service that creates its own collaborators is welded to them:

```ts
class SignupService {
  private readonly users = new PostgresUserRepository(process.env.DATABASE_URL!);

  async signup(email: string) {
    const user = { id: randomUUID(), email, createdAt: new Date().toISOString() };
    await this.users.save(user);
    await new SesMailer().send({ to: email, subject: 'Welcome' });
    return user;
  }
}
```

To test it you need a database, an email account, and a way to freeze the clock and the UUID generator. To move from SES to another provider you edit business code. **Dependency injection (DI)** fixes both: a class receives what it needs instead of building it.

## Constructor injection

```ts
interface SignupDependencies {
  users: UserRepository;
  mailer: Mailer;
  clock: { now(): Date };
  ids: () => string;
}

class SignupService {
  constructor(private readonly deps: SignupDependencies) {}

  async signup(email: string) {
    const user = { id: this.deps.ids(), email, createdAt: this.deps.clock.now().toISOString() };
    await this.deps.users.save(user);
    await this.deps.mailer.send({ to: email, subject: 'Welcome' });
    return user;
  }
}
```

The service now depends on **interfaces** (dependency inversion from SOLID). The clock and the id generator count as dependencies too: anything non-deterministic or with side effects belongs in the constructor. Passing one `deps` object instead of five positional parameters keeps call sites readable and lets you add a dependency without reordering arguments.

## The composition root

Something still has to call `new PostgresUserRepository(...)`. That place is the **composition root**: one module (often `main.ts` or `app.ts`) where real implementations are created and wired, close to process startup.

```ts
export function createContainer(overrides: Partial<SignupDependencies> = {}) {
  const deps: SignupDependencies = {
    users: new PostgresUserRepository(config.databaseUrl),
    mailer: new SesMailer(config.ses),
    clock: { now: () => new Date() },
    ids: randomUUID,
    ...overrides,
  };
  return { ...deps, signupService: new SignupService(deps) };
}
```

Business code never reads `process.env` or imports concrete adapters; only the root does. The `overrides` parameter is the seam tests use to swap a single piece.

## Fakes, stubs and mocks

| Double | What it is | Example |
| --- | --- | --- |
| **Fake** | A working, simplified implementation | `InMemoryUserRepository` backed by a `Map` |
| **Stub** | Returns canned answers | `clock: { now: () => new Date('2026-01-01') }` |
| **Mock/spy** | Records calls so tests assert on them | `mailer.send = vi.fn()` |

Prefer fakes for repositories (tests read like real usage and survive refactors) and spies only for outgoing side effects you must verify, such as "an email was sent". Over-mocking (asserting every internal call) produces tests that break on every refactor without catching bugs.

## Containers and frameworks

| Approach | How it wires | Where you meet it |
| --- | --- | --- |
| Manual DI (pure functions and `new`) | You write the composition root | Hono, Express, Fastify apps, most Node code |
| Decorator-based container | `@Injectable()` classes resolved by type metadata | NestJS, Angular, InversifyJS |
| Framework context | Dependencies attached per request (`c.set('db', db)`) | Hono `c.var`, Fastify `decorate` |

Angular's `inject()` and NestJS providers are the same idea with automation. In most Node services manual wiring is enough and keeps the dependency graph explicit: you can read it top to bottom in one file.

## Pitfalls

- **Service locator**: passing the whole container in and calling `container.get('mailer')` inside methods hides dependencies again.
- **Module singletons**: `import { db } from './db'` at the top of a service is hidden coupling; tests must mock the module system.
- **Too many dependencies**: a constructor with eight collaborators signals a class doing too much.
- **Injecting configuration strings deep down**: inject a configured client, not `DATABASE_URL`.
- **Lifetimes**: a per-request value (current user, transaction) injected into a singleton leaks between requests; pass it as a method argument instead.

## When to choose it

Use constructor (or factory-function) injection for every service that touches I/O, time or randomness, and keep exactly one composition root per process. Use a DI container when the framework brings one (NestJS) or the graph is large; for small and medium APIs manual wiring is simpler, faster to start and easier for AI tools to follow. Pure helpers need no injection: just call them.

## Working with AI

Ask for "constructor injection with interfaces for the repository, mailer, clock and id generator, and a `createContainer(overrides)` composition root". When reviewing, check:

- No `new` of infrastructure classes, `process.env`, `Date.now()` or `randomUUID()` inside services.
- Dependencies are typed as interfaces you own, not vendor classes.
- One composition root; no hidden singletons imported from other modules.
- Tests use fakes for storage and spies only for side effects that matter.
- Per-request data flows through arguments, never through fields of shared services.
