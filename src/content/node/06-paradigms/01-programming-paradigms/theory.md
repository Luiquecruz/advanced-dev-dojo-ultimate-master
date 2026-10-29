# Programming Paradigms

A paradigm is a way of organizing code: where state lives, how steps are expressed, and how parts talk to each other. JavaScript and TypeScript are **multi-paradigm**, so a Node codebase usually mixes several. Knowing the names helps you read unfamiliar code, choose a style for a module, and tell an AI assistant precisely what you want ("pure functions, no classes" is a much better brief than "clean code").

## The same task in four styles

Task: total the amount of paid orders.

**Imperative / procedural**: step-by-step instructions that change local state.

```ts
function paidTotal(orders: Order[]): number {
  let total = 0;
  for (const order of orders) {
    if (order.status === 'paid') total += order.amount;
  }
  return total;
}
```

**Declarative / functional**: describe the result with expressions and pure functions; no mutation.

```ts
const paidTotal = (orders: Order[]) =>
  orders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + order.amount, 0);
```

**Object-oriented**: state and behavior travel together behind an interface.

```ts
class OrderBook {
  constructor(private readonly orders: Order[]) {}

  paidTotal(): number {
    return this.orders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + order.amount, 0);
  }
}
```

**Event-driven / reactive**: code reacts to things happening over time instead of being called in sequence.

```ts
let paidTotal = 0;
orderEvents.on('order:paid', (order: Order) => {
  paidTotal += order.amount;
});
```

All four are correct. They differ in what is easy to test, extend and reason about.

## Paradigms at a glance

| Paradigm | Core idea | Where you meet it in Node | Strength | Weakness |
| --- | --- | --- | --- | --- |
| Imperative / procedural | Sequence of statements, mutable locals | Scripts, CLIs, hot loops | Obvious control flow, fast | Grows into long functions with shared state |
| Functional | Pure functions, immutability, composition | Business rules, data transforms, middleware composition | Easy to test, safe to parallelize | Unfamiliar idioms, copying cost on huge data |
| Object-oriented | Objects with state, interfaces, polymorphism | NestJS, SDK clients, repositories, adapters | Encapsulation, swappable implementations | Deep inheritance, god classes |
| Event-driven | Emit and react to events | `EventEmitter`, streams, the event loop, queues, webhooks | Decoupling, natural for I/O | Hard to trace "who reacts to what" |
| Reactive streams | Values over time as composable streams | RxJS, Node streams, SSE pipelines | Powerful async composition | Steep learning curve, hidden subscriptions |
| Declarative (DSLs) | Say *what*, the engine decides *how* | SQL, Zod schemas, route tables, Terraform | Concise, optimizable by the engine | Escape hatches are awkward |

## You already know these from the frontend

- **React**: declarative UI and a functional mindset (pure render, immutable state, reducers, hooks as composition).
- **Angular**: object-oriented services with dependency injection plus reactive programming with RxJS and signals.
- **Vue**: reactive state at the core, with either an options (object-like) or composition (functional) API.

Backends mirror these choices. Express and Hono are functional at heart (handlers and middleware are functions). NestJS is Angular's philosophy on the server: classes, decorators, DI containers. Node itself is event-driven: the event loop, `EventEmitter` and streams are the runtime's native paradigm.

## Mixing paradigms on purpose

A healthy Node service often looks like this:

- **Functional core** for decisions: pricing, permissions, validation, state transitions.
- **Objects** for things with identity and lifecycle: database pools, API clients, caches, adapters.
- **Event-driven edges** for I/O: HTTP requests, queue consumers, streams, domain events.
- **Declarative DSLs** where an engine does the work better: SQL, schemas, route definitions.

The anti-pattern is not "using OOP" or "using FP"; it is mixing them randomly inside one module, so a reader cannot predict whether a function mutates its argument or whether a class holds hidden state.

## Pitfalls

- **Paradigm purity contests**: rewriting working code to be "more functional" with no testability or clarity gain.
- **Class wrappers around stateless functions** (`new PriceCalculator().calculate(x)`) that add ceremony and no encapsulation.
- **Hidden mutation in "functional" code**: `array.sort()` inside a `map` callback mutates the input.
- **Event spaghetti**: emitting events for synchronous, required steps; use direct calls when the caller needs the result.

## When to choose it

Choose per module, not per project. Business rules: functional. Stateful infrastructure: objects behind interfaces. Asynchronous inputs and decoupled reactions: events. Data querying and validation: declarative tools. Follow the framework's grain (NestJS wants classes, Hono wants functions) unless you have a strong reason, because consistency beats theoretical elegance.

## Working with AI

State the paradigm in your brief: "pure functions for the rules, classes only for adapters, no inheritance, no shared mutable module state". When reviewing generated code, check:

- One consistent style per module, matching the framework and the rest of the codebase.
- No mutation of arguments in code presented as functional.
- No classes that hold no state and exist only to group functions.
- Event listeners are registered once (not per request) and every emitted event has a documented consumer.
