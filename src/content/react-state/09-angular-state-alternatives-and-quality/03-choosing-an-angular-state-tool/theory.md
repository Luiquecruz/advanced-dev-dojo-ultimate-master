Before starting, complete the previous lessons of this module.

There is no best Angular state tool; there is a tool that fits the kind of state and the size of the team. This lesson turns the earlier lessons into a decision order and a table of trade-offs.

## Decision order

Ask in this order and stop at the first yes:

1. **Is it derived?** Use `computed`.
2. **Is it navigable and shareable?** Use the URL.
3. **Is it form data?** Use the form, committing on submit.
4. **Is it server data?** Use `resource`/`httpResource` or a query library.
5. **Is it local to one component?** Use a component signal.
6. **Shared by a few components of one feature?** A signal service at the feature scope.
7. **A feature with entities, async methods and conventions?** A SignalStore.
8. **Many features react to the same events, audit or time travel needed?** An action store (NgRx Store or NGXS).

Most of an application ends at steps 1 to 6.

## The options side by side

| Option | Strength | Cost | Fits |
| --- | --- | --- | --- |
| Component signal | zero setup | not shared | UI state |
| Signal service | simple, no dependency | you set conventions | small shared state |
| BehaviorSubject service | familiar, works with RxJS | verbose reads, manual cleanup | legacy code, event streams |
| SignalStore | conventions, entities, hooks | one dependency, learning curve | feature state |
| NgRx Store | traceability, Effects, Entity, DevTools | boilerplate | large apps and teams |
| NGXS | decorators, less ceremony | smaller ecosystem | teams who like its style |
| ComponentStore | scoped RxJS store | RxJS-centric | existing code |
| Query library | cache, refetch, invalidation | experimental in Angular | read-heavy server data |

## Comparisons that come up

- **Signal in a component or in a service**: lift when a second consumer appears.
- **BehaviorSubject or signals**: signals for state, subjects for event streams.
- **Own store or SignalStore**: when the team keeps rewriting loading flags, entity maps and hooks, adopt the store.
- **SignalStore or NgRx Store**: SignalStore for feature-local state; NgRx Store when features coordinate through events.
- **HttpClient with manual state or a query library**: manual is clear for a few endpoints; a library when you write cache and retry logic.
- **Global or scoped stores**: scope to the route or feature unless the data is truly application-wide.

## Team and migration costs

A tool is also a hiring and review decision. Count the people who know it, the quality of its documentation, how often it makes breaking changes and what leaving costs. Prefer the smallest tool that works and the one your team can debug at midnight. A mixture is normal, but **one owner per piece of state**: do not keep the same feature in two stores.

## Common mistakes

- Starting with NgRx Store for a small app because it is "enterprise".
- Putting everything in a global store because one feature needed sharing.
- Adopting an experimental library without pinning and testing.
- Running two stores for one feature.
- Choosing by popularity instead of the shape of the problem.

## When to choose it

Default to the signal-based tools. Escalate only when a concrete pain appears (duplicated plumbing, cross-feature events, audit needs), and record the decision in a short note the next developer can find.
