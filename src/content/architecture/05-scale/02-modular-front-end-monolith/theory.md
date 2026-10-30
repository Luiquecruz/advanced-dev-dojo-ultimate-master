## One deploy, many owners

A **modular front-end monolith** is one application with one build and one deploy, divided into **domain modules** with explicit boundaries. Each module (`catalog`, `cart`, `account`) is owned by a team, exposes a small public API, and keeps everything else private. You get most of the code autonomy people expect from micro-frontends, without distributed deploys, duplicated React copies or runtime contracts.

```
src/
  app/              composition root: creates the shell, registers modules
  shell/            layout, navigation, routing, event bus wiring
  shared/           framework-level helpers, no domain knowledge
  modules/
    catalog/
      index.js      public API: register(shell)
      CatalogPage.jsx
    cart/
      index.js
      cartStore.js
```

## Three rules make it modular

1. **A public API per module.** Other code imports `modules/cart`, never `modules/cart/cartStore`. The `index.js` decides what is public; everything else can be renamed or rewritten freely.
2. **No cross-module internal imports.** Modules do not import each other at all. When the catalog needs the cart to react, it publishes an event (`cart:add`) or goes through a contract the shell provides.
3. **Rules are verified, not hoped for.** A rule nobody checks erodes in weeks. Enforce it in CI with ESLint (`import/no-restricted-paths`, `eslint-plugin-boundaries`), dependency-cruiser, Nx module boundary tags, or a small architecture test that parses imports, like the one in this lesson's challenge.

## The shell composes, modules register

Instead of the shell importing pages, each module **registers itself** into the shell. The shell offers extension points (routes, navigation entries, header slots) and an event bus; the composition root is the only place listing which modules exist.

```jsx
export function register(shell) {
  const store = createCartStore();
  shell.events.on('cart:add', store.add);
  shell.addPage({ path: '/cart', title: 'Cart', Component: () => <CartPage store={store} /> });
}
```

```jsx
const applicationModules = [catalogModule, cartModule, accountModule];

export function createApp() {
  const shell = createShell();
  applicationModules.forEach((applicationModule) => applicationModule.register(shell));
  return shell;
}
```

Events are the loosest coupling: the publisher names a fact, any number of subscribers react, and removing the cart module does not break the catalog. Keep the event catalog small and documented (`type` plus payload shape), because events are a public API too.

## Ownership and lazy loading

- **Ownership**: a `CODEOWNERS` file maps folders to teams, so a change in `modules/cart/` requires a review from the cart team, and nobody else is blocked.

```
/src/modules/catalog/  @shop/catalog-team
/src/modules/cart/     @shop/checkout-team
/src/shell/            @shop/platform-team
```

- **Lazy loading per module**: the module's page can be a `React.lazy(() => import('./CartPage'))`, so each module becomes its own chunk. One deploy does not mean one bundle.

## A path to extraction

Because a module already talks to the rest of the app through `register(shell)` and events, extracting it later is mechanical: move the folder into a monorepo package with the same API, or wrap `register` in a `mount(element)` contract and deploy it as a micro-frontend. The hard part of a migration is always untangling imports; a modular monolith has done that work up front.

## Pitfalls

- **A `shared/` folder that grows domain logic.** Shared code must not know about products or carts; otherwise every module depends on every other through it.
- **Module-level singletons.** State created at import time is shared by every app instance, test and story. Create it inside `register`.
- **Events for everything.** Events are fire-and-forget; when a module needs an answer (the cart total for the header), expose a query through the module's public API or a shell contract instead of request/response over a bus.
- **Boundaries only in the folder names.** Without an automated check, the first deadline brings back a deep import.

## When to choose it

It is the default for any product with more than one team, or one team expecting to grow. Choose it before a monorepo or micro-frontends, and stay until independent deploys are a proven need. It is overkill for a small app owned by a few developers, where feature folders with public `index` files are enough.
