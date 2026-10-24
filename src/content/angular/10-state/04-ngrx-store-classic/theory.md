## The Redux pattern in Angular

`@ngrx/store` is the original NgRx library: a **single immutable state tree** changed only by **actions** going through pure **reducers**, and read through memoized **selectors**. It is more ceremony than a signal service, and that is the point: every change is an explicit, logged event.

```text
component --dispatch(action)--> Store --reducer(state, action)--> new state
    ^                                                                  |
    +------------------------ selectSignal(selector) <-----------------+
```

## Actions: what happened

An action is a plain object with a `type`. `createAction` builds a typed factory for it; `props<T>()` declares its payload.

```ts
import { createAction, props } from '@ngrx/store';

export const todoAdded = createAction('[Todo Page] Todo Added', props<{ title: string }>());
export const todosCleared = createAction('[Todo Page] Todos Cleared');

todoAdded({ title: 'Write tests' });
// { type: '[Todo Page] Todo Added', title: 'Write tests' }
```

The `[Source] Event` convention describes *where* and *what*, not *how* to change state. Name actions as past-tense events (`todoAdded`), not commands (`addTodo`). `createActionGroup({ source, events })` generates several actions for one source at once.

## Reducers: how state changes

A reducer is a **pure function** `(state, action) => newState`. `createReducer` with `on()` handlers keeps it readable:

```ts
export const todosReducer = createReducer(
  initialState,
  on(todoAdded, (state, { title }) => ({ ...state, items: [...state.items, title] })),
  on(todosCleared, () => initialState),
);
```

Rules: never mutate `state`, never call APIs, never read the clock or random numbers. Side effects (HTTP, navigation) belong in **effects** (`@ngrx/effects`), which listen to actions and dispatch new ones.

## Selectors: how state is read

```ts
export const selectTodos = createFeatureSelector<TodosState>('todos');
export const selectItems = createSelector(selectTodos, (state) => state.items);
export const selectCount = createSelector(selectItems, (items) => items.length);
```

Selectors are **memoized**: the projector only reruns when its inputs change, so derived data is cheap and returns stable references. Each selector also exposes `.projector` for unit tests without building a whole state tree.

## Wiring it up

Register reducers at bootstrap with `provideStore` (or lazily per route with `provideState`):

```ts
bootstrapApplication(App, {
  providers: [provideStore({ todos: todosReducer })],
});
```

In components, inject `Store`, dispatch actions and read with `selectSignal`, which returns an Angular **signal**. That fits zoneless change detection perfectly:

```ts
export class TodoPage {
  private readonly store = inject(Store);
  protected readonly count = this.store.selectSignal(selectCount);

  add(title: string) {
    this.store.dispatch(todoAdded({ title }));
  }
}
```

## Legacy way vs modern way

| Before | Now |
| --- | --- |
| `StoreModule.forRoot(reducers)` in an `NgModule` | `provideStore(reducers)` |
| `StoreModule.forFeature('todos', reducer)` | `provideState('todos', reducer)` or `provideState(feature)` from `createFeature` |
| `this.store.select(selectCount)` + `async` pipe | `this.store.selectSignal(selectCount)` |
| `switch (action.type)` reducers | `createReducer` + `on()` |

`store.select` (an Observable) is still useful when you combine state with RxJS streams.

## When to use it

Choose the classic Store for large apps with many teams, where an audit trail of events, Redux DevTools time travel and strict unidirectional flow pay off. For local or feature state, a signal service or the SignalStore is usually enough. Both can live in the same app.
