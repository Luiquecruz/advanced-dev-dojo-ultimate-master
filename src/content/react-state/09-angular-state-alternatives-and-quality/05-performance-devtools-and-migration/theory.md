Before starting, complete the previous lessons of this module.

State design decides how much work Angular does after a change. Three things matter: how finely updates are targeted, how derived values are cached, and how change detection finds what to update.

## Granularity

A signal notifies only the places that read it. Prefer several focused signals or a store whose fields are separate signals over one big object that changes as a whole:

```ts
readonly filters = signal({ q: '', page: 1, sort: 'name' });   // any change notifies every reader
readonly q = signal(''); readonly page = signal(1);              // readers of `page` ignore `q`
```

SignalStore state is exposed as separate signals per top-level key, with deep signals for nested objects, so a component reading `store.page()` is not touched by a change to `store.q`. Do not split state so far that you lose atomic updates; a pair that must change together belongs in one object.

## Memoized derived state

`computed` caches until a dependency changes. NgRx selectors (`createSelector`) and NGXS `@Selector` do the same for their stores. Cheap `computed` calls are fine; expensive work (sorting thousands of rows) belongs in one memoized value read by many places, not repeated in templates through method calls.

```ts
readonly sorted = computed(() => [...this.rows()].sort(byName));   // once per change
```

Keep selectors small and composed, and avoid creating new objects in them without need: a new array every time defeats referential equality downstream.

## Change detection

- **`OnPush`** components check only when an input changed, an event fired in the component, or a signal read in the template changed.
- **Zoneless** applications do not patch async APIs at all; updates come from signals, events, the `async` pipe and `markForCheck`. Writing state through signals is exactly what zoneless needs. Code that mutates plain fields and relies on a zone will not update.
- Track `@for` items by a stable key so the DOM is reused.

## Immutability and equality

Signals compare with `Object.is` by default. Replacing an array with an equal copy still notifies; mutating without replacing does not. Update immutably, and for objects that are rebuilt often provide an `equal` function so unchanged results do not notify.

## Incremental migration

Large codebases move step by step, never in one release:

1. Stop adding new `BehaviorSubject` stores; write new state as signals.
2. Bridge old stores: `toSignal(subject$, { requireSync: true })` for reads, `toObservable(signal)` for old consumers.
3. Convert leaf components to signals and `OnPush`, then their parents.
4. Replace `async` pipes with signals feature by feature, when touched anyway.
5. Enable zoneless after the app no longer relies on zone-triggered updates.

At each step the application keeps working and one owner per piece of state remains.

## DevTools and logging

NgRx Store has Store DevTools (`provideStoreDevtools`) that show actions and state and support time travel through the Redux DevTools extension. SignalStore does not use actions; log transitions with a custom feature or a hook that watches state, and gate it to development builds. Log **intent and outcome** (action names, errors), not whole payloads containing personal data.

## Stores competing for one feature

The slowest state bug to debug is two stores updating the same feature: one writes, the other writes back, and a loop appears. Give each feature one store and let others read its signals.

## Common mistakes

- One giant state object notified on every change.
- Expensive derived values computed in template method calls.
- Mutating arrays inside signals.
- Enabling zoneless while code still relies on zone updates.
- Logging full state, including sensitive fields, in production.

## When to choose it

Measure first. Fix granularity and memoization where the profiler shows work, adopt OnPush and signals as the default for new code, and migrate old stores incrementally.
