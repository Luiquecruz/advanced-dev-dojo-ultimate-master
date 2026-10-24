## Growing a SignalStore with features

A real store needs more than state and setters: derived values, async loading, collections and lifecycle logic. `@ngrx/signals` covers each need with a **feature** you add to `signalStore(...)`. Features run top to bottom and each one sees everything declared before it.

```ts
export const BooksStore = signalStore(
  { providedIn: 'root' },
  withEntities<Book>(),
  withState({ query: '', loading: false }),
  withComputed(({ entities, query }) => ({
    filtered: computed(() => entities().filter((book) => book.title.includes(query()))),
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    async load() {
      patchState(store, { loading: true });
      const books = await firstValueFrom(http.get<Book[]>('/api/books'));
      patchState(store, setAllEntities(books), { loading: false });
    },
    setQuery(query: string) {
      patchState(store, { query });
    },
  })),
  withHooks({
    onInit(store) {
      store.load();
    },
  }),
);
```

## withComputed

`withComputed(factory)` receives the store signals and returns a dictionary of **derived signals**. Wrap each value in `computed()`, or return a plain function: NgRx 22 also accepts `() => value` and wraps it in `computed()` for you. Use it for counts, filters, totals and view models; never copy derived data into state.

## withMethods

Methods are where state changes and side effects live. The factory runs **inside an injection context**, so `inject(HttpClient)` or `inject(Router)` works there. A common idiom is a default parameter: `withMethods((store, http = inject(HttpClient)) => ({ ... }))`.

Async work is just an `async` method that patches state before and after the request. For streams with cancellation (search-as-you-type), `rxMethod` from `@ngrx/signals/rxjs-interop` lets you pipe through `debounceTime` and `switchMap`.

## withEntities

`withEntities<Todo>()` from `@ngrx/signals/entities` adds a normalized collection:

| Member | Kind | Content |
| --- | --- | --- |
| `ids` | state signal | `[1, 2, 3]` |
| `entityMap` | state signal | `{ 1: {...}, 2: {...} }` |
| `entities` | computed signal | `[{...}, {...}]` in id order |

You never edit `ids` and `entityMap` by hand. Pass **entity updaters** to `patchState` instead:

```ts
patchState(store, addEntity(todo));
patchState(store, setAllEntities(todos));
patchState(store, updateEntity({ id, changes: { completed: true } }));
patchState(store, updateEntity({ id, changes: (todo) => ({ completed: !todo.completed }) }));
patchState(store, removeEntity(id));
```

Entities need an `id` property by default; otherwise pass `{ selectId: (book) => book.isbn }`. For several collections in one store, name them: `withEntities({ entity: type<User>(), collection: 'user' })` produces `userIds`, `userEntityMap`, `userEntities`.

`patchState` accepts **several updaters at once**, so `patchState(store, setAllEntities(todos), { loading: false })` is a single, atomic change.

## withHooks

`withHooks({ onInit, onDestroy })` runs code when the store is **created** and **destroyed**. Both hooks run in an injection context, so you can inject services or start an `effect`. For a root store, `onInit` runs the first time something injects it; for a component-provided store, it follows that component's lifecycle.

```ts
withHooks({
  onInit(store) {
    store.load();
  },
  onDestroy() {
    console.log('store destroyed');
  },
}),
```

## Pitfalls

- **Order matters**: `withComputed` cannot read state declared after it.
- **Do not put derived data in state** (`remaining: 2`): it goes stale. Use `withComputed`.
- **Handle errors** in async methods (`try/catch` and an `error` state key); a rejected promise inside `onInit` is easy to miss.
- **Keep hooks thin**: call a method instead of putting loading logic inside `onInit`, so tests and components can call it again.

## Legacy comparison

With the classic NgRx Store the same feature needs actions, a reducer with `@ngrx/entity`'s `createEntityAdapter`, selectors and an effect class for the HTTP call. The SignalStore keeps the same ideas (normalized entities, derived selectors, side effects outside the view) in a single, type-safe composition.
