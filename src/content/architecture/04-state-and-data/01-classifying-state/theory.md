## The question before the library

Most "we need Redux" discussions are really classification mistakes. A team sees data shared by several screens, reaches for a global store, and ends up copying server responses into it, mirroring the URL into it and storing form drafts in it. Each copy needs syncing code, and each sync is a bug waiting to happen.

The architectural rule is short:

> Before adding a global library, ask: is this state **remote**, **URL**, **form**, or **really UI** state?

Every kind has a natural home. Put each piece of state in its home and the "global state" left over is usually tiny. The State Fundamentals module of the React State Management track covers each kind and its tools in depth; this lesson is about using the classification as an architecture decision.

## One home per kind

| Kind | Example | Home |
| --- | --- | --- |
| Remote (server) state | products, the current user, notifications | A server cache: TanStack Query, SWR, RTK Query, or a GraphQL client |
| URL state | filters, sort, page, active tab, selected id | The URL (search params, path segments) |
| Form state | a draft being edited, field errors, touched flags | A form library (React Hook Form) or local state |
| Local UI state | an open dropdown, a hover, an accordion | `useState` / `useReducer` in the component |
| Shared client state | the cart before checkout, theme, a multi-panel editor selection | Context for low-frequency values, a small store (Zustand, Jotai, Redux Toolkit) for the rest |
| Derived values | totals, filtered lists, `isValid` | Computed during render (or memoized); never stored |

Two questions sort most cases:

1. **Who owns the truth?** If the server owns it, the client only holds a **cache** with staleness, refetching and invalidation. Copying it into a client store creates a second source of truth.
2. **Should it survive a reload or a shared link?** If yes, it belongs in the URL (or on the server). If it should vanish when the component unmounts, it is local.

## Flows: state machines

Some state is not a value but a **process**: a checkout (cart → address → payment → confirming → done or failed), a file upload, a wizard. Modelled with booleans (`isLoading`, `isPaying`, `hasError`), impossible combinations appear (`isPaying && hasError && step === 1`). A state machine (XState, or a reducer with a `status` union) makes states and allowed transitions explicit, so "pay twice" or "go back while confirming" are impossible by construction. Reach for one when a flow has more than three or four states with guarded transitions.

## GraphQL normalized caches at a glance

GraphQL clients such as **Apollo Client** and **Relay** go further than a key-based cache: they **normalize** responses into a table of entities by type and id (`Product:3`). When a mutation returns `Product:3` with a new price, every query that included it updates automatically, with no invalidation. Relay adds fragments colocated with components and a compiler. The trade-off is weight and strict conventions (stable ids, schema-driven tooling). With REST, TanStack Query's key-based cache plus invalidation covers most needs.

## The state map

The deliverable of this decision is a **state map**: a table listing every piece of state on a screen or in the app, its kind, its home and the reason. It takes an hour to write and it:

- exposes duplicates ("the selected category is in the URL **and** in the store");
- makes reviews concrete ("why is this form draft in Redux?");
- documents when to promote state (local → lifted → URL or Context → store) and why;
- belongs next to the ADRs of the project (module 01).

| State | Kind | Home | Why |
| --- | --- | --- | --- |
| Product list | remote | TanStack Query `productQueries.list(q)` | owned by the API, cached per search |
| `q`, `category`, `page` | URL | search params | shareable, survives reload |
| Checkout flow | flow | state machine | guarded steps, no impossible states |
| Cart | shared client | small store | used by header and checkout, not on the server yet |
| Cart total | derived | computed | never stored |

## Pitfalls

- **Server data in a client store.** Manual loading flags, no staleness, no deduplication.
- **Mirroring the URL.** Reading search params into `useState` and syncing back in effects; read the URL directly.
- **Storing derived values.** A `total` field that someone forgets to update.
- **Global by default.** Promote state only when a second, distant consumer appears.

## When to choose it

Classify state at the start of every feature and whenever someone proposes a new global library. Choose a global client store only for client-owned state shared by distant parts of the app; choose a server cache for anything the backend owns, the URL for anything shareable, a form library for drafts and a state machine for multi-step flows.
