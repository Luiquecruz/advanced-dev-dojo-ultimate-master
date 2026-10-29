# Testing Backend Code

When an assistant writes most of the code, tests become the part you own: they encode what "correct" means and they catch the regressions the next generated change will introduce. A good backend test suite is fast, deterministic, and fails for reasons a human cares about.

## The levels

| Level | What runs | Speed | Catches |
| --- | --- | --- | --- |
| **Unit** | One function or class, collaborators replaced by fakes | Milliseconds | Rule bugs: pricing, permissions, state transitions |
| **Integration** | Your code against real infrastructure: the HTTP layer, a real database in a container | Tens to hundreds of ms | Wiring, SQL, migrations, serialization, middleware order |
| **End-to-end** | The deployed system through its public interface | Seconds | Configuration, networking, auth flows across services |
| **Contract** | Consumer expectations checked against the provider's API (Pact, OpenAPI) | Fast | Breaking API changes between services or with the frontend |

The classic "pyramid" says many unit tests, fewer integration, few e2e. For typical CRUD APIs many teams prefer a "trophy": most tests at the **integration** level through HTTP, because that is where bugs live (validation, status codes, queries), plus unit tests for the real business rules.

## Testing through HTTP

Frameworks expose the app without opening a port, the same way this course's `request(app, path)` works:

```ts
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('POST /bookmarks', () => {
  it('rejects an invalid URL with 400', async () => {
    const app = createApp({ repository: new InMemoryBookmarkRepository(), now: () => new Date('2026-01-01') });
    const response = await app.request('/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ url: 'not a url' }),
    });
    expect(response.status).toBe(400);
  });
});
```

Hono has `app.request()` and `testClient` (typed), Express and Fastify use **Supertest** or `fastify.inject()`. The composition root from the DI lesson (`createApp(deps)`) is what makes this easy: tests pass fakes or a test database.

## Real databases with Testcontainers

Mocking an ORM proves nothing about your SQL. **Testcontainers** starts a throwaway Postgres (or Redis, Kafka) in Docker for the test run:

```ts
const container = await new PostgreSqlContainer('postgres:17').start();
const db = createDb(container.getConnectionUri());
await migrate(db);
```

Run migrations once, then isolate tests with a transaction rolled back after each test or by truncating tables. Slower than fakes, but it catches the bugs fakes cannot: constraints, indexes, query syntax, transaction behavior.

## Test doubles

| Double | Use for |
| --- | --- |
| Fake (in-memory repository) | Fast service tests that read like real usage |
| Stub (fixed clock, fixed id generator) | Determinism |
| Spy / mock (`vi.fn()`) | Verifying an outgoing side effect: email sent, event published |
| HTTP mock (MSW, nock) | Third-party APIs you do not control |

Mock at **your** boundaries (your `PaymentGateway` interface), not deep inside libraries. Tests that assert every internal call break on refactors and catch nothing.

## Runners

- **Vitest**: fast, Jest-compatible API, native TypeScript and ESM, watch mode. The default choice for new TypeScript projects and the same tool many frontends already use.
- **`node:test`**: built into Node (`node --test`), zero dependencies, with `assert` and mocking helpers; good for libraries and small services.
- **Jest**: still common in existing codebases; ESM and TypeScript need more setup.

## Determinism

Flaky tests come from hidden inputs: the clock, random ids, ordering of parallel operations, shared state between tests, real network. Inject the clock and id generator, reset state per test (a fresh app per test), never depend on test order, and avoid real sleeps (use fake timers or injected `sleep`).

## Pitfalls

- **Tautological tests**: the test recomputes the expected value with the same logic as the code. Use literal expected values.
- **Snapshot everything**: huge JSON snapshots get approved blindly. Assert the fields that matter.
- **Only the happy path**: most production incidents are 4xx/5xx paths, timeouts and duplicates.
- **Coverage as a goal**: 95% coverage with no assertions on error bodies is worth less than 60% that pins every status code.
- **Shared database state** between tests running in parallel.

## When to choose it

Write unit tests for business rules with branches (pricing, permissions, state machines). Write HTTP-level integration tests for every endpoint's contract: success status and body, validation errors, auth failures, not found. Use Testcontainers when you own SQL or migrations. Add e2e smoke tests for the critical flows after deploy, and contract tests when another team or your frontend depends on the API shape.

## Working with AI

Ask for tests **before or alongside** code: "write Vitest integration tests through `app.request` for these status codes and error bodies, using an in-memory repository and a fixed clock". Review generated tests for:

- Literal expected values, not recomputed ones.
- At least one failing-path test per endpoint (400, 401, 404, 409) asserting the body shape.
- No real network, no real clock, no sleeps, no dependence on test order.
- Mocks only at your own interfaces; no assertions on private calls.
- The test actually fails when you break the code (mutate one line and run it).
