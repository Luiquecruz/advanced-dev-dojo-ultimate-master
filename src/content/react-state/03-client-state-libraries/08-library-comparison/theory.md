## Same problem, different mental models

Every client state library answers three questions differently: **where does state live**, **how do you change it**, and **how does a component learn that something it reads changed**. The last one decides re-render granularity, and the first two decide how the code reads in a large team.

| | Mental model | Boilerplate | Devtools | Re-render granularity | SSR | Ecosystem fit |
| --- | --- | --- | --- | --- | --- | --- |
| **Context + useReducer** | value broadcast down a tree | low (built in) | React DevTools only | every consumer of the context re-renders | native, per request | dependency injection, low-frequency values (theme, auth, locale) |
| **Zustand** | one external store, selector hooks | very low | Redux DevTools via `devtools` middleware | per selector (`useShallow` for objects) | module stores leak between requests: use a store per request via context | most apps needing a little shared client state |
| **Redux Toolkit** | single immutable store, actions + reducers | medium (slices reduce it a lot) | best in class: action log, time travel, diffs | per `useSelector` (memoize with `createSelector`) | store per request, well documented | large teams, strict conventions, RTK Query for server data, listener middleware |
| **Jotai** | atom graph, bottom-up | low | Jotai DevTools, React DevTools labels | per atom | `Provider` + `useHydrateAtoms` per request | many interdependent values, per-widget scopes |
| **MobX** | observable objects, tracked reads | low (classes) | MobX devtools, `spy`, `getDependencyTree` | per observed property, automatic | `enableStaticRendering(true)` on the server | rich OOP domain models, computed graphs, reactions |
| **Valtio** | mutable proxy, immutable snapshots | very low | Redux DevTools via `devtools` util | per accessed property, automatic | proxy per request via context | mutable style, state shared with non-React code |
| **XState** | finite states, events, actors | medium-high (explicit) | Stately inspector and visual editor | per snapshot (`useSelector` to narrow) | `createActor` with snapshot restore | flows: wizards, checkout, media, protocols |

## Axis by axis

**Boilerplate vs explicitness.** Zustand and Valtio need the least code; Redux Toolkit and XState need the most, and that explicitness is the product: every change is a named event you can log, replay and review.

**Devtools.** If the team debugs production issues by reading action logs or replaying sessions, Redux Toolkit (and XState's inspector for flows) are ahead. Proxy libraries make "who changed this?" harder.

**Granularity.** Context re-renders every consumer; selector-based stores re-render when the selected slice changes; atoms and proxies track dependencies automatically. Granularity matters for high-frequency updates (drag, typing, live data), much less for a theme toggle.

**SSR and React Server Components.** Server Components cannot use hooks or stores at all. On the server, module-level singletons are shared by **every request**, so any store with user data must be created per request and passed through context (Zustand's `createStore` + context, RTK's `makeStore`, Jotai's `Provider`).

**Ecosystem.** RTK brings RTK Query, entity adapters and a large hiring pool; Zustand and Jotai are the most common modern defaults; MobX has a loyal enterprise base; XState is the standard for statecharts.

## What does not differ

None of them is a server cache. Remote data belongs in TanStack Query, RTK Query or framework loaders; whichever client library you pick should hold only what the client owns. Most production apps run **one query library + one small client store + URL state + local state**.

## When to use it / when not to

Use this comparison when **starting** a project or when an existing tool is clearly failing (performance, team scale, flows full of booleans). Do not use it as a reason to migrate a working codebase: switching libraries has a real cost, and most pain comes from putting server data, form state or local UI state in a global store, which no library fixes. Choose by the **shape of the state** (flags, graph, domain model, flow) and the **team's needs** (traceability, conventions, simplicity), not by benchmarks.
