# OOP and SOLID

Object-oriented code groups **state and behavior** behind an interface. In backends it shines for things with identity and a lifecycle: a database pool, a payment client, a cache, a notification channel. Angular developers already work this way (services, injected classes); React developers mostly meet it in SDKs (`new Stripe(key)`, `new S3Client()`).

The goal is not inheritance trees. It is **replaceable parts**: code that depends on an interface, so one implementation can be swapped for another (a real SMS provider for a fake in tests, Twilio for another vendor) without touching the caller.

## Classes in TypeScript

```ts
interface Notifier {
  readonly channel: string;
  send(message: { to: string; body: string }): Promise<void>;
}

class EmailNotifier implements Notifier {
  readonly channel = 'email';

  constructor(private readonly transport: (to: string, text: string) => Promise<void>) {}

  async send(message: { to: string; body: string }): Promise<void> {
    await this.transport(message.to, message.body);
  }
}
```

`implements` is a compile-time check only: the class must have the interface's members. TypeScript is structurally typed, so a plain object `{ channel: 'push', send: async () => {} }` also satisfies `Notifier`. That is why interfaces, not base classes, are the useful contract.

Parameter properties (`private readonly transport`) declare and assign a field in one go. Prefer `readonly` dependencies: they are set once in the constructor and never swapped mid-request.

## The strategy pattern

A **strategy** is one interchangeable implementation of an interface, picked at runtime. Instead of:

```ts
async function notify(channel: string, to: string, body: string) {
  if (channel === 'email') await smtp.send(to, body);
  else if (channel === 'sms') await sms.send(to, body.slice(0, 160));
  else if (channel === 'slack') await slack.post(to, body);
}
```

each branch becomes a class, and the caller looks up the right one:

```ts
class NotificationService {
  private readonly byChannel: Map<string, Notifier>;

  constructor(notifiers: Notifier[]) {
    this.byChannel = new Map(notifiers.map((notifier) => [notifier.channel, notifier]));
  }

  notify(channel: string, message: { to: string; body: string }): Promise<void> {
    const notifier = this.byChannel.get(channel);
    if (!notifier) throw new Error(`Unsupported channel: ${channel}`);
    return notifier.send(message);
  }
}
```

Adding Slack now means adding a `SlackNotifier` and registering it. `NotificationService` does not change.

## SOLID in one table

| Principle | Meaning | Backend smell when broken |
| --- | --- | --- |
| **S**ingle responsibility | One reason to change per module | A route handler that validates, prices, emails and logs |
| **O**pen/closed | Extend by adding code, not editing it | A growing `switch (provider)` in the core flow |
| **L**iskov substitution | Any implementation honors the contract | A `FakeMailer` that throws where the real one resolves; an SMS notifier that silently drops long messages |
| **I**nterface segregation | Small, focused interfaces | A `UserRepository` with 30 methods that every fake must stub |
| **D**ependency inversion | Depend on abstractions; inject concrete classes | `new PostgresClient()` inside a service constructor |

Dependency inversion is the one with the biggest payoff; the next lesson is dedicated to it.

## Pitfalls

- **Inheritance for reuse**: `class SmsNotifier extends EmailNotifier` to reuse one helper couples two unrelated channels. Prefer composition: pass a helper in or share a function.
- **Anemic wrappers**: a class with one method and no state is just a function. `const send = (msg) => ...` is fine.
- **`this` loss**: passing `service.notify` as a callback detaches `this`. Use arrow functions as fields or call `service.notify(...)` directly.
- **God services**: `UserService` with 40 methods is SRP broken; split by use case.
- **Leaking vendor types**: if your `Notifier` interface exposes Twilio's response type, swapping vendors breaks every caller.

## When to choose it

Use classes and interfaces for components with configuration, state or a lifecycle (clients, pools, caches, channels), and the strategy pattern when the same operation has several interchangeable implementations chosen by data or configuration (payment providers, storage backends, notification channels, pricing per country). For stateless business rules, pure functions (previous lesson) are simpler. NestJS and Angular make classes and decorators the default; Hono and Express leave the choice to you, and most teams mix both styles.

## Working with AI

Ask for "an interface plus one class per provider, registered in a map, with no channel-specific branches in the service". When reviewing:

- The core service never names a concrete implementation (`if (channel === 'sms')`, `new TwilioClient`).
- Each implementation honors the same contract: same return type, same error behavior, no silent no-ops.
- Interfaces are small and use your domain types, not the vendor SDK's.
- No inheritance chains deeper than one level without a strong reason.
- Unknown keys fail loudly with a clear error instead of falling through to a default implementation.
