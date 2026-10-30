## Checkpoint: the state and data decision

The third entry of your portfolio answers "where does each piece of state live, and who owns its truth?". This module classified state, built a data access layer with query key factories and moved server state across the network with prefetching and hydration. The checkpoint combines them into an ADR plus its most useful attachment: the **state map**.

The common failure this ADR prevents is "global by default": one store that receives server responses, mirrors the URL, holds form drafts and grows sync code for each. A good record makes the global part small and explains why.

## The decision checklist

For every piece of state, ask in order:

1. **Who owns the truth?** If the server does, the client only holds a cache with staleness and invalidation.
2. **Should it survive a reload or a shared link?** Then it belongs in the URL.
3. **Is it a draft being edited?** A form library or local state.
4. **Can it be computed from other state?** Then it is derived and never stored.
5. **Is it a process with guarded steps?** A state machine makes impossible states impossible.
6. **Is it read by distant components on different routes?** Only then a client store.
7. Otherwise it is **local** to the component.

| Home | Buys | Costs |
| --- | --- | --- |
| Server cache (TanStack Query, SWR, RTK Query) | Caching, deduplication, refetching, invalidation | Query keys and invalidation to learn |
| URL | Shareable, survives reload, back button works | Serialization, only small values |
| Form library | Validation, touched and dirty flags without re-rendering everything | Another API |
| Local state | Simplest, dies with the component | Not reachable from far away |
| Client store (Context, Zustand, Jotai, Redux Toolkit) | One source for distant consumers | A global to maintain, easy to overuse |
| State machine (XState, a status reducer) | Explicit states and transitions | More code for simple flows |
| Derived | No sync bugs | Recomputed on render (memoize if expensive) |

## Writing the ADR well

- **Context**: the kinds of state the product has, where they come from and what hurts today (stale lists, duplicated loading flags, broken shared links, double submissions). Mention both server and client state explicitly.
- **Decision**: one "We will..." sentence assigning each **kind** to a home, then the state map with one row per piece and a reason.
- **Alternatives**: typically "one global store for everything" and "local state only". Reject each with a concrete failure from the context.
- **Consequences**: positive (fewer sync bugs, a tiny global store) and negative (more libraries, query key conventions, a machine to maintain).

The state map is the part reviewers use daily: "why is this draft in the store?" now has a written answer.

## Example: a project board

```js
export const adr = {
  id: 9,
  title: 'Give every kind of board state one home',
  status: 'accepted',
  layer: 'state-and-data',
  context:
    'Tasks come from the server and are edited by several users; today they are copied into Redux and go stale. Board filters are lost on reload. Drag previews are purely client state.',
  decision:
    'We will cache tasks with TanStack Query, keep filters in search params, hold drag previews in local state and compute column counts during render.',
  alternatives: [
    { option: 'Keep everything in Redux', reason: 'Copies of server tasks go stale and need manual refetch code.' },
    { option: 'Real-time sync engine', reason: 'Three users per board do not justify running a sync server.' },
  ],
  consequences: {
    positive: ['Edits by other users appear after a refetch without custom code.'],
    negative: ['Every feature must follow the query key factory convention.'],
  },
};
```

## Pitfalls

- Copying server responses into a client store "to share them": the server cache already is shared.
- Mirroring the URL into state and syncing it back with effects.
- Storing a total or an `isValid` flag that someone forgets to update.
- Modeling a payment flow with three booleans and discovering `isPaying && isDone` in production.

## When to choose it

Write this ADR when a product first fetches data, when someone proposes adding a global store, and when sync bugs (stale lists, lost filters, double submissions) start appearing. Keep the state map next to it and update the map, not the accepted ADR, as pieces are added.
