# Architecture Styles

Layers and patterns organize code inside one service. **Architecture styles** decide how many deployable units you have, how they talk, and where the boundaries between business areas sit. These decisions are expensive to reverse, and they are where AI assistants are least reliable: an assistant will happily scaffold twelve microservices for a three-person startup. Your job is to choose, then brief precisely.

## Deployment styles

| Style | Shape | Strengths | Costs |
| --- | --- | --- | --- |
| **Monolith** | One codebase, one deployable, one database | Simple to build, test, deploy and debug; transactions are easy | Grows into a tangle without internal boundaries; scales as one unit |
| **Modular monolith** | One deployable, strict internal modules (`billing/`, `catalog/`) with public APIs | Monolith simplicity plus clear ownership; modules can be extracted later | Needs discipline (lint rules, architecture tests) to keep boundaries |
| **Microservices** | Many independently deployed services, each owning its data | Independent deploys and scaling per team; fault isolation | Network failures, distributed data, observability, versioning, ops headcount |
| **Serverless functions** | Functions run per request or event on a managed platform (AWS Lambda, Cloudflare Workers, Vercel) | No servers to manage, scale to zero, pay per use | Cold starts, execution limits, vendor coupling, harder local testing, connection limits to databases |

A modular monolith in Node often looks like feature folders with an `index.ts` public API per module, the same feature-sliced idea used in frontends, enforced by an architecture test.

Microservices solve an **organizational** problem first: many teams shipping independently. Conway's law says systems mirror the communication structure of the teams that build them; splitting a small team's product into many services adds network calls without adding independence.

## Structural styles inside a service

**Hexagonal (ports and adapters)** and **clean architecture** put the domain in the center. The core defines interfaces (ports) such as `PaymentGateway` or `OrderRepository`; infrastructure implements them as adapters (Stripe, Postgres, HTTP routes). Dependencies always point inward.

```ts
interface OrderRepository {
  save(order: Order): Promise<void>;
}

class PlaceOrder {
  constructor(private readonly orders: OrderRepository, private readonly payments: PaymentGateway) {}
}
```

This is the layered architecture and dependency injection from earlier lessons taken to its conclusion: the core can be tested and reused with no framework at all. The cost is more interfaces and mapping code, worth it for complex domains and overkill for CRUD.

## Communication styles

| Style | How | Use when |
| --- | --- | --- |
| Synchronous request/response | HTTP, gRPC calls between services | The caller needs the answer now |
| Asynchronous messaging | Queues (SQS, RabbitMQ, BullMQ) and logs (Kafka) | Work can happen later; spikes must be absorbed |
| **Event-driven** | Services publish facts (`order.placed`) and others subscribe | Several independent reactions to one fact; loose coupling |

Event-driven systems decouple producers from consumers but trade immediate consistency for **eventual consistency**: the email service learns about the order a few hundred milliseconds later, and messages can arrive twice or out of order, so consumers must be **idempotent**. Writing to the database and publishing an event must not diverge; the **outbox pattern** (store the event in the same transaction, publish it afterwards) solves that.

**CQRS** (separate models for writes and reads) and **event sourcing** (store events, derive state) are powerful for audit-heavy domains and add significant complexity; reach for them only with a concrete need.

## Pitfalls

- **Distributed monolith**: microservices that must be deployed together and call each other synchronously in long chains; all the costs, none of the independence.
- **Shared database between services**: couples them through schema changes; each service owns its tables.
- **Serverless with connection-hungry databases**: thousands of concurrent functions exhaust Postgres connections; use a pooler or an HTTP-based driver.
- **Resume-driven architecture**: Kafka and Kubernetes for a product with 50 users.
- **No boundaries in the monolith**: the problem was never the monolith, it was the missing modules.

## When to choose it

Default to a **modular monolith** with layered or hexagonal modules: one repository, one deploy, clear boundaries. Add a queue for background work early; it is cheap. Extract a service only when a module needs independent scaling, a different runtime, a separate team, or isolation of a risky dependency. Choose serverless for spiky or low traffic, event handlers, cron jobs and edge logic, and when the team has no appetite for operating servers. Choose event-driven integration when several parts react to the same fact and can tolerate eventual consistency.

## Working with AI

Give the assistant the decision, not the buzzword: team size, expected load, consistency needs, deployment target, and the chosen style. Ask it to argue against its own proposal. When reviewing an architecture or scaffold:

- Number of deployables matches the number of teams and real scaling needs.
- Each module or service owns its data; no cross-module table access.
- Every network call has a timeout, retries with backoff and a failure mode.
- Event consumers are idempotent and the publish path uses an outbox or equivalent.
- Local development and tests run without the whole cloud (fakes, containers).
