# Design Patterns for Backends

Three patterns do most of the structural work in Node services: **adapter** (make a foreign API fit your interface), **decorator** (add behavior around an object without changing it) and **factory** (decide which object to build from configuration). You already use them on the frontend: an API client wrapping `fetch` is an adapter, a higher-order component or an Axios interceptor is a decorator, and `createStore(config)` is a factory.

All three rely on one thing from earlier lessons: code depends on **your** interface.

```ts
interface PaymentGateway {
  charge(amountCents: number, currency: string): Promise<{ id: string; status: 'succeeded' | 'declined' }>;
}
```

## Adapter: translate a foreign API

Third-party SDKs rarely match your interface. One uses callbacks, another wants dollars as strings, a third returns its own status enum. An adapter implements your interface and translates in both directions:

```ts
class LegacyPayAdapter implements PaymentGateway {
  constructor(private readonly client: LegacyPayClient) {}

  charge(amountCents: number, currency: string) {
    return new Promise<{ id: string; status: 'succeeded' | 'declined' }>((resolve, reject) => {
      this.client.makePayment({ value: (amountCents / 100).toFixed(2), curr: currency.toUpperCase() }, (error, response) => {
        if (error) return reject(error);
        resolve({ id: response!.transactionRef, status: response!.approved ? 'succeeded' : 'declined' });
      });
    });
  }
}
```

The rest of the codebase never sees `makePayment`, callbacks or string amounts. Changing provider means writing another adapter; tests use a fake that implements `PaymentGateway`. This is the "ports and adapters" idea (hexagonal architecture) at the scale of one class.

## Decorator: wrap, do not modify

A decorator implements the same interface, holds the original and adds behavior before or after delegating:

```ts
function withLogging(gateway: PaymentGateway, log: (line: string) => void): PaymentGateway {
  return {
    async charge(amountCents, currency) {
      const result = await gateway.charge(amountCents, currency);
      log(`charge ${amountCents} ${currency} -> ${result.status}`);
      return result;
    },
  };
}

const gateway = withLogging(withLimit(new LegacyPayAdapter(client), 100_000), console.log);
```

Logging, metrics, retries, caching, timeouts, circuit breakers and rate limits are all decorators. Each one is small, testable alone and composable. **Order matters**: the outermost decorator runs first, so logging outside the limit also logs rejected charges, while logging inside it only sees charges that passed.

TypeScript's `@decorator` syntax (used by NestJS and Angular) is a different, language-level feature for annotating classes; the pattern itself needs only functions.

## Factory: choose the implementation from configuration

```ts
function createPaymentGateway(config: { provider: 'legacy' | 'fake'; logging?: boolean }): PaymentGateway {
  const base = config.provider === 'legacy' ? new LegacyPayAdapter(new LegacyPayClient()) : new FakeGateway();
  return config.logging ? withLogging(base, console.log) : base;
}
```

The factory is where `if (provider === ...)` belongs: once, at startup, in the composition root. Business code receives a ready `PaymentGateway`. Failing fast on unknown values (`throw new Error('Unknown payment provider: x')`) turns a typo in an environment variable into a startup crash instead of a silent fallback to the fake gateway in production.

## Other patterns you will meet

| Pattern | Backend use |
| --- | --- |
| Middleware chain | Decorators for requests (Hono, Express, Koa) |
| Repository | Adapter over storage (persistence module) |
| Builder | Query builders (Kysely, Drizzle) |
| Observer | `EventEmitter`, domain events, webhooks |
| Singleton | One pool or client per process, created in the composition root |

## Pitfalls

- **Leaky adapters**: returning the vendor's response object or throwing vendor error classes; callers end up depending on the SDK anyway.
- **Unit bugs**: cents vs units, seconds vs milliseconds, upper vs lower case currency. Adapters are where these conversions live; test them.
- **Decorators that change the contract**: a caching decorator that returns stale writes, a retry decorator that retries non-idempotent charges (always pass an idempotency key).
- **Factories with business logic**: picking a provider per customer at runtime is a strategy (OOP lesson), not startup wiring.
- **Pattern inflation**: an `AbstractPaymentGatewayFactoryProvider` for one implementation.

## When to choose it

Write an adapter for every external SDK or API your core depends on, even when there is only one provider: it is the seam for tests and for the next migration. Use decorators for cross-cutting concerns around one interface; for HTTP-wide concerns use middleware instead. Use a factory when configuration selects implementations or decorator stacks. Skip all three for code that is internal, simple and has a single obvious implementation.

## Working with AI

Ask for "an adapter implementing our `PaymentGateway` interface over the SDK, a logging decorator, and a factory reading the provider from config that throws on unknown values". When reviewing:

- No vendor types or errors cross the adapter boundary.
- Unit conversions (cents, currency case, time units) are explicit and tested.
- Decorators return exactly what the wrapped object returns and rethrow its errors.
- Decorator order is deliberate and documented in the factory.
- Unknown configuration fails at startup; there is no silent default to a fake in production.
