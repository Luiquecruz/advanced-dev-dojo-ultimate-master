Build the facade of a todo feature. **`facade.ts`** already contains `Todo`, the `TODO_API` token (`{ list(): Promise<Todo[]> }`) and `TodosStore` (complete: `status`, `items`, `setStatus`, `setItems`, `toggle`). You write `TodosFacade` (`@Injectable({ providedIn: 'root' })`).

1. The facade injects the store and the API as **private** members (a `private` keyword or `#` field); components must use only the facade.
2. `vm` is a `computed` view model `{ status, items, remaining }` where `remaining` counts the items that are not completed.
3. `load()` sets the store status to `'loading'`, calls `api.list()`, stores the items and sets `'ready'`; when the call rejects it sets `'error'` and keeps the previous items.
4. `toggle(id: number)` delegates to the store.
