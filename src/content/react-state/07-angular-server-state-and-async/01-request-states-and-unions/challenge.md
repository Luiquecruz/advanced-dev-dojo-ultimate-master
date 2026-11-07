Write a request-state store. **`request.ts`** exports `RequestState<T>`, the injection token `LOADER` (a function `() => Promise<string[]>`) and `NamesStore` (`@Injectable({ providedIn: 'root' })`).

1. `RequestState<T>` is a discriminated union on `status` with `'idle'`, `'loading'`, `'success'` (with `data: T`), `'empty'` and `'error'` (with `message: string`).
2. `NamesStore.state` is a read-only signal that starts as `{ status: 'idle' }`.
3. `load()` sets `loading`, awaits the injected loader and then sets `success` with the names, `empty` for an empty array, or `error` with the error's message (`'Unknown error'` when the thrown value is not an `Error`).
4. A `load()` call while the state is `loading` does nothing (no second loader call).
5. `names` is a `computed` with the data of a `success` state, or `[]` for any other state. `isLoading` is a `computed` boolean.
