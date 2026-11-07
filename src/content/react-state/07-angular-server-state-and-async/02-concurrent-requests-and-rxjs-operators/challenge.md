Control concurrency in a search and a save flow. **`search.ts`** exports the tokens `SEARCH` (`(query: string) => Observable<string[]>`) and `SAVE` (`(name: string) => Observable<string>`), the constant `DEBOUNCE_MS = 20` and `SearchStore` (`@Injectable({ providedIn: 'root' })`).

1. `find(query: string)` feeds a search pipeline: wait `DEBOUNCE_MS`, skip repeated queries, run `SEARCH` for the latest query with **cancellation** of the previous request, and write the response to `results` (a read-only signal, `[]` at start).
2. A failing search leaves `results` as `[]` and the pipeline must keep working for the next query.
3. `submit(name: string)` runs `SAVE` but ignores new submits while a save is in progress. Each finished save appends its returned name to `saved` (a read-only signal of strings).
4. Both pipelines are created in the constructor and end with `takeUntilDestroyed()`.
