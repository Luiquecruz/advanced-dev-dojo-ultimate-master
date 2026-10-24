## A crowded landscape

React only ships primitives for state (`useState`, `useReducer`, context, `useSyncExternalStore`). Everything else is a library, and each one embodies a different **mental model**. Knowing the models helps you read existing codebases and pick the right tool.

| Model | Libraries | Idea |
| --- | --- | --- |
| Single store + actions | Redux Toolkit, Zustand | One object, explicit updates |
| Atoms | Jotai, Recoil (archived) | Small independent units composed bottom-up |
| Observable / proxy | MobX, Valtio, Legend-State | Mutate objects, reads are tracked automatically |
| State machines | XState | Explicit states and transitions |
| Signals | Preact Signals, TC39 proposal | Fine-grained reactive values |

## MobX: observable objects

MobX makes objects **observable** and components **observers**. You mutate state directly; MobX tracks which observables each component read during render and re-renders only those components.

```jsx
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';

class TimerStore {
  seconds = 0;
  constructor() {
    makeAutoObservable(this);
  }
  tick() {
    this.seconds += 1;
  }
}

const timer = new TimerStore();

const TimerView = observer(() => <span>{timer.seconds}</span>);
```

Strengths: very little boilerplate, automatic fine-grained updates, natural for class-based domain models. Trade-offs: "magic" tracking, components must be wrapped in `observer`, and mutation-based code feels different from idiomatic React.

## Valtio: proxy state with snapshots

Valtio (from the Zustand and Jotai authors) wraps an object in a `proxy`. You mutate it anywhere; components read an immutable **snapshot** with `useSnapshot`, and re-render only when the properties they accessed change.

```jsx
import { proxy, useSnapshot } from 'valtio';

const state = proxy({ count: 0 });

function Counter() {
  const snap = useSnapshot(state);
  return <button onClick={() => state.count++}>{snap.count}</button>;
}
```

Rule: **read from the snapshot, write to the proxy**.

## XState: state machines and actors

Many bugs come from impossible combinations of booleans (`isLoading && isError`). XState models logic as a **finite state machine**: the component is in exactly one state, and only declared events cause transitions.

```js
import { createMachine } from 'xstate';

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  states: {
    idle: { on: { FETCH: 'loading' } },
    loading: { on: { RESOLVE: 'success', REJECT: 'failure' } },
    success: {},
    failure: { on: { RETRY: 'loading' } },
  },
});
```

In React, `useMachine(fetchMachine)` from `@xstate/react` returns the current snapshot and `send`. XState v5 is built around the **actor model**, and the lighter `@xstate/store` offers a Zustand-like store with event-based updates. Machines shine for complex flows: checkouts, wizards, media players, multiplayer protocols. They can be visualized and tested as diagrams.

## Recoil: the sunset

Recoil (Meta, 2020) introduced atoms and selectors with string keys and Suspense integration. It stayed experimental, stopped receiving updates, and the repository was **archived in 2025**. It also relied on React internals that broke with newer React versions. Migrate Recoil code to Jotai, whose API maps almost one to one (`atom`, derived atoms instead of selectors, `atomFamily` in `jotai/utils`).

## Signals

Signals are reactive values that notify subscribers directly, bypassing component re-renders. Frameworks such as Solid, Preact, Vue, Angular and Svelte use them natively, and a **TC39 proposal** aims to standardize them in JavaScript. React deliberately does not adopt signals: its model is "UI as a function of state", optimized by the **React Compiler** (automatic memoization) rather than fine-grained subscriptions. Libraries like `@preact/signals-react` exist but patch React internals, so treat them with caution.

## Other names you will meet

- **Effector**, **Nanostores**: small event or atom-based stores, framework-agnostic.
- **Legend-State**: observable state focused on performance and sync/persistence.
- **Redux-Saga / Redux-Observable**: legacy Redux middleware for side effects with generators or RxJS; mostly replaced by thunks, listeners and RTK Query.
- **Unstated / Constate**: thin context wrappers from the early hooks era.

## How to choose

1. Server data? Use a query library, not a state library.
2. A little global client state? Context or Zustand.
3. Many interdependent pieces? Jotai.
4. Large team, strict conventions, rich devtools? Redux Toolkit.
5. Complex flows with explicit states? XState.
6. Prefer mutable domain models? MobX or Valtio.

Most production apps combine two tools: a query library for server state plus one small client store.
