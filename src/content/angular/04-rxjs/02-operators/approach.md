1. Read the requirements as a pipeline: wait for a pause, normalize, deduplicate, then fetch.
2. Add `debounceTime(debounceMs)` first so bursts of keystrokes collapse into one value.
3. Trim with `map` and drop repeats with `distinctUntilChanged()`; order matters, trim before comparing.
4. Use `switchMap` for the async step so a new query unsubscribes from the previous request.
5. Inside `switchMap`, return `of([])` for short queries so the list clears without calling the API.
6. Wire the input `(input)` event to `queries.next(...)`; `toSignal` already exposes the results to the template.
