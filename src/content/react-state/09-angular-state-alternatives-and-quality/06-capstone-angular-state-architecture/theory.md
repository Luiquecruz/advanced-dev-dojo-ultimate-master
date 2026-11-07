Before starting, complete every lesson of this path up to this point. This project asks you to place each kind of state where it belongs, in one small feature.

## The feature

A mini shop has a product list loaded from a server, a category filter, and a cart that survives a reload. Each concern maps to a kind of state from the first lesson:

| Concern | Kind of state | Owner |
| --- | --- | --- |
| The product list and its loading status | server state | the store, with a request-state field |
| The selected category | feature state | the store |
| What is visible in the selected category | derived state | `computed` |
| Cart lines and total | derived state | `computed`, from quantities and products |
| Cart quantities | persisted client state | the store, written to injected storage |

Notice what is **not** stored: the filtered list, the cart lines with their subtotals and the total. They are derived from the fields that are.

## Design decisions to make

1. **State shape.** Store cart quantities by product id (`Record<number, number>`), not copies of products. If a price changes after a reload, the cart shows the new price because lines are derived by joining ids to the current products.
2. **Request state.** One status field (`idle`, `loading`, `ready`, `error`) instead of separate booleans. A failed reload keeps the previous products.
3. **Persistence.** Write only the quantities, with a version, through an injected storage. Read defensively: corrupt text, wrong types and unknown versions give an empty cart.
4. **Concurrency.** A second `load()` while one is running should do nothing.
5. **Boundaries.** Components would read the store's signals and call its methods; HTTP and storage arrive through injection tokens so tests can replace them.

## Why a SignalStore here

The feature has state, derived values, async methods and a startup step (restoring the cart). A SignalStore gives those four a fixed place: `withState`, `withComputed`, `withMethods` and `withHooks`. A plain signal service would also work; this project uses the store so you practice composing features and keeping one owner per piece of state.

## Common mistakes

- Storing the total and updating it by hand.
- Persisting the product list or the loading status.
- Copying products into the cart, so prices go stale.
- Reading storage without a `try/catch`.
- Calling `localStorage` directly, which makes tests and SSR awkward.

## When to choose it

Use this shape whenever a feature mixes server data, a filter and a persisted client list: keep ids, derive views, persist the minimum and inject the edges.
