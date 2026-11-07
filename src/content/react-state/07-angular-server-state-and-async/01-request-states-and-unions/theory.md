Before starting, complete [HTTP Error Handling](/angular/http-error-handling) in the Angular track and the previous module in this track.

Server data is never just "the data". Every remote value is in one of several situations: not requested, loading, available, empty or failed. A component that only stores `items: Item[]` cannot tell "still loading" from "nothing exists", and shows a wrong screen in both.

## The five request states

| State | Meaning | Screen |
| --- | --- | --- |
| `idle` | nothing requested yet | nothing, or a prompt |
| `loading` | a request is in flight | spinner or skeleton |
| `success` | data arrived and is not empty | the list |
| `empty` | the request worked and returned nothing | an empty-state message |
| `error` | the request failed | a message and a retry |

Empty is its own state because it is a valid answer, not a failure and not a loading step.

## Discriminated unions

Model the state as one value, not as separate booleans:

```ts
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty' }
  | { status: 'error'; message: string };
```

Three booleans (`loading`, `error`, `data`) allow impossible combinations, such as loading with an error. A union allows only the five valid states, and TypeScript narrows on `status`: inside `case 'success'`, `state.data` exists; elsewhere it does not.

```ts
readonly names = computed(() => {
  const state = this.state();
  return state.status === 'success' ? state.data : [];
});
```

## Where the state lives

Keep the union in a private signal, expose it read-only, and derive the convenience flags with `computed`. Transitions are methods of the service, so no component sets `loading` by hand.

```ts
async load() {
  if (this.current().status === 'loading') return;   // no duplicate request
  this.current.set({ status: 'loading' });
  try {
    const data = await this.loader();
    this.current.set(data.length === 0 ? { status: 'empty' } : { status: 'success', data });
  } catch (error) {
    this.current.set({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
```

A guard against a second `load()` while loading is a one-line defense against double clicks. Later lessons cover deliberate concurrency control.

## Rendering from the union

```html
@switch (state().status) {
  @case ('loading') { <p>Loading...</p> }
  @case ('empty') { <p>No results yet.</p> }
  @case ('error') { <button (click)="retry()">Retry</button> }
}
```

Keep stale data visible during a refresh when it helps the user: a `reloading` state that still carries `data` is better than blanking a list on every refetch. Angular's `resource()` models exactly that with a `reloading` status.

## Common mistakes

- Using `loading: boolean` and `error: string | null` together, allowing both to be set.
- Treating an empty array as an error, or as "still loading".
- Forgetting to reset `error` when a new request starts.
- Letting components change the status directly.
- Writing `try/catch` around the whole component instead of one place in the service.

## When to choose it

Use a hand-written union when you own a small, specific async flow. When the flow is a plain "load this by key", `resource()` or a query library already provides these states, and writing your own repeats work.
