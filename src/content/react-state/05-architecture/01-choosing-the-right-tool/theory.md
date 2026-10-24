## The senior question is "what kind of state is this?"

Most state management problems are classification problems. Put server data, drafts, filters and UI flags in one global store and any library will hurt; classify first and a few small, boring tools suffice. Ask these questions **in order**; the first "yes" usually decides.

1. **Does it come from the server?** It is a cache, not state: **TanStack Query**, or **RTK Query** when the app already runs on Redux Toolkit. Server Components or framework loaders for read-only, server-rendered pages.
2. **Should it survive a reload, a shared link or the back button?** Filters, sort, pagination, selected tab, search term: **URL state** (`useSearchParams`, router loaders).
3. **Is it what the user is typing before submitting?** Form state: **local state**, uncontrolled inputs with `FormData`/Actions, or **React Hook Form** (+ zod) for large or validated forms.
4. **Is it used by one component or a small subtree?** **`useState`**; **`useReducer`** when several values change together through named transitions. Lift it to the closest common parent before reaching for anything global.
5. **Does a subtree need a value that rarely changes** (theme, locale, current user, a service instance)? **Context**, with a guarded hook. Context is dependency injection, not a high-frequency store.
6. **Is it client-owned, shared across distant parts of the app and updated often?** An **external store**:
   - **Zustand**: default choice; tiny API, selectors, middleware.
   - **Redux Toolkit**: large teams, strict conventions, auditable action log, time travel, RTK Query in the same store.
   - **Jotai**: many small interdependent values, derived graphs, per-widget scopes.
   - **MobX / Valtio**: mutable domain models with automatic tracking (MobX for class-based models and reactions, Valtio for plain objects and non-React code).
7. **Is it a flow where order matters** (wizard, checkout, upload with retry, auth lifecycle)? **XState** (or a reducer with a `status` union when the flow is small).

Derived values (totals, filtered lists, `isValid`) are **not state** at any level: compute them during render, in selectors, derived atoms or computeds.

## The comparison table

| Tool | Kind of state | Mental model | Boilerplate | Devtools | Re-render granularity | SSR | Ecosystem fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `useState` | local UI | value + setter | none | React DevTools | owner + children | native | everything starts here |
| `useReducer` | local, multi-field transitions | events → reducer | low | React DevTools | owner + children | native | flows with a `status` union |
| Context | low-frequency subtree values | broadcast | low | React DevTools | every consumer | native | theme, auth, i18n, DI |
| URL (`useSearchParams`) | shareable view state | address bar as store | low | browser history | route consumers | native | filters, pagination, tabs |
| Zustand | shared client state | store + selectors | very low | Redux DevTools (middleware) | per selector | store per request | most apps |
| Redux Toolkit | shared client state at scale | actions + reducers | medium | best: log, time travel | per selector | store per request | big teams, RTK Query |
| Jotai | graphs of small values | atoms, bottom-up | low | Jotai DevTools | per atom | Provider + hydration | editors, linked filters |
| MobX / Valtio | mutable domain models | tracked proxies | low | MobX tools / Redux DevTools | per property | static rendering / per request | OOP models, non-React code |
| XState | flows and protocols | states, events, actors | high (explicit) | Stately inspector | per snapshot / selector | snapshot restore | checkout, wizards, media |
| TanStack Query | server cache | keys + freshness | low | Query Devtools | per observer / `select` | prefetch + hydrate | any REST/GraphQL client |
| RTK Query | server cache in Redux | endpoints + tags | medium | Redux DevTools | per selector | store per request | Redux codebases, OpenAPI codegen |
| React Hook Form | form drafts | uncontrolled fields + subscriptions | low | RHF DevTools | per field / `watch` | native | large or validated forms |

## Typical architecture

A healthy production app usually has **TanStack Query (or RTK Query) + a small client store + URL state + local state + a form library**. The store is often the smallest piece (workspace, cart, preferences); a second client store library is almost never justified.

## Red flags in code review

- `useEffect` copying fetched data into `useState` or a store.
- A global store with `isModalOpen`, `inputValue` or `hoveredId`.
- Filters that reset on reload, or URLs that cannot be shared.
- Context holding a frequently changing object consumed by dozens of components.
- Five booleans describing one flow.

## When to use it / when not to

Use this decision order when designing a feature, reviewing a PR or planning a migration: it turns "which library?" debates into "which kind of state?" agreements. Do not use it to justify tools upfront: start with local state and the server cache, and promote state to the URL, Context or a store only when a concrete need (sharing, persistence, performance, traceability) appears.
