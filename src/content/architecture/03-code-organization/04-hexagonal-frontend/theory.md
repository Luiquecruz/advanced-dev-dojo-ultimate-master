## The problem: business rules trapped in components

```jsx
function Checkout({ items }) {
  async function handleClick() {
    if (items.length === 0) return alert('Empty cart');
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal >= 100 ? 0 : 10;
    await fetch('/api/orders', { method: 'POST', body: JSON.stringify({ items, subtotal, shipping }) });
  }
  return <button onClick={handleClick}>Place order</button>;
}
```

The free-shipping rule lives in a click handler, next to `fetch` and `alert`. Testing it needs a DOM, a mocked network and a click. Reusing it in a React Native app, a server action or a background job means copying it. Changing the backend from REST to GraphQL means editing the component.

## Hexagonal architecture (ports and adapters)

Alistair Cockburn's **hexagonal architecture** puts the application at the center and everything technical at the edges:

- **Domain**: entities and rules as plain functions or classes (`createOrder(items)` validates and prices). No React, no `fetch`, no storage.
- **Application (use cases)**: one function per user intention (`placeOrder`), orchestrating the domain and talking to the outside world only through **ports**.
- **Ports**: interfaces the application *needs*, named in its own language: `orderGateway.save(order) → { id }`. In JavaScript a port is a documented shape; in TypeScript, an `interface`.
- **Adapters**: implementations of ports for a technology: `httpOrderGateway` (REST), `localStorageOrderGateway`, `inMemoryOrderGateway` (tests, demos, storybooks). React components are adapters too: a *driving* adapter that turns clicks into use case calls.

**Clean Architecture** (Robert C. Martin) is the same idea drawn as circles. The one rule both share is the **dependency rule**: source code dependencies point inward. Adapters import the application; the application imports the domain; the domain imports nothing.

```text
ui/  ──►  application/  ──►  domain/
adapters/ ──► (implements ports of) application/
App.jsx (composition root) ──► everything
```

## The composition root

Someone has to pick the concrete adapters. That place is the **composition root**: the one module that creates adapters, injects them into use cases and hands the use cases to the UI. In React, that is usually `App.jsx` or `main.jsx`:

```jsx
const orderGateway = createHttpOrderGateway('/api/orders');
const placeOrder = createPlaceOrder(orderGateway);

root.render(
  <PlaceOrderProvider placeOrder={placeOrder}>
    <App />
  </PlaceOrderProvider>,
);
```

Use cases receive their ports as arguments (a factory such as `createPlaceOrder(orderGateway)`): that is **dependency injection** without a container. Components receive use cases through **props or Context**; Context is React's built-in DI mechanism. A test or a Storybook story renders the same component with a different provider value.

## What you gain

- **Fast, honest tests**: domain rules are tested as pure functions; use cases with an in-memory adapter; components with a fake use case. Only the HTTP adapter needs a mocked network.
- **Replaceable infrastructure**: REST to GraphQL, `localStorage` to IndexedDB, a mock backend during development: one new adapter, one line in the composition root.
- **Shared rules**: the domain runs on the server, in workers or in another UI framework.

## Pitfalls

- **Ceremony for CRUD**: if the frontend only displays what the API returns, there is no domain to protect. Ports around `GET /users` add files without adding value. TanStack Query hooks *are* a perfectly good adapter for read-heavy screens.
- **Leaking adapters inward**: a use case that returns a `Response`, or a domain object with an `axios` error inside, breaks the rule silently. Adapters translate errors into domain-level messages.
- **Duplicating backend rules**: frontend domain logic should cover what the UI needs to decide (pricing previews, validation, permissions to show), and the server must still enforce everything.
- **A global service locator** (`services.get('orders')` everywhere) hides dependencies. Pass them explicitly.

## When to choose it

Use ports and adapters when the frontend owns real business rules (pricing, eligibility, offline sync, complex validation), when the same rules run in several places, or when the backend contract is unstable. For CRUD screens over a stable API, a data-access layer with query hooks is enough. Many apps mix both: a hexagonal core for checkout, plain query hooks for everything else.
