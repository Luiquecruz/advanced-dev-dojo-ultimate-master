## Operators

Operators are pure functions that take an observable and return a new one. You chain them with `pipe()`:

```ts
import { filter, map } from 'rxjs';

numbers$.pipe(
  filter((n) => n % 2 === 0),
  map((n) => n * 10),
);
```

Nothing runs until somebody subscribes, and each operator subscribes to the one before it.

### The everyday toolbox

| Operator | What it does |
| --- | --- |
| `map(fn)` | Transform each value |
| `filter(fn)` | Drop values that fail the predicate |
| `tap(fn)` | Side effect (logging) without changing the value |
| `debounceTime(ms)` | Emit only after `ms` of silence (typing) |
| `distinctUntilChanged()` | Skip a value equal to the previous one |
| `startWith(v)` | Emit `v` first |
| `take(n)` / `takeUntil(notifier$)` | Complete after n values / when notifier emits |
| `catchError(fn)` | Replace an error with a fallback observable |
| `combineLatest`, `forkJoin`, `merge` | Combine several streams |

### Higher-order mapping: the four `*Map` operators

When each value starts **another** async operation (an HTTP call), use a flattening operator. They differ in what happens when a new value arrives while the previous inner observable is still running:

| Operator | Policy | Typical use |
| --- | --- | --- |
| `switchMap` | Cancel the previous inner, switch to the new one | Search-as-you-type, route params |
| `mergeMap` | Run all in parallel | Independent fire-and-forget saves |
| `concatMap` | Queue: wait for the previous to finish | Ordered writes |
| `exhaustMap` | Ignore new values while busy | Login / submit button spam |

`switchMap` **unsubscribes** from the stale request. With `HttpClient`, that aborts the HTTP call, so stale results can never overwrite fresh ones.

### Classic typeahead

```ts
import { Subject, debounceTime, distinctUntilChanged, map, switchMap, catchError, of } from 'rxjs';

const query$ = new Subject<string>();

const results$ = query$.pipe(
  debounceTime(300),                // wait for the user to pause
  map((query) => query.trim()),
  distinctUntilChanged(),           // "abc" → "abc " is not a new search
  switchMap((query) =>
    api.search(query).pipe(catchError(() => of([]))), // keep the stream alive on errors
  ),
);
```

Put `catchError` **inside** `switchMap`. An error that reaches the outer stream completes it, and the search box dies after the first failed request.

### From observable to template

In a component, turn the result into a signal with `toSignal()` (from `@angular/core/rxjs-interop`). It subscribes immediately and unsubscribes automatically when the component is destroyed:

```ts
protected readonly results = toSignal(results$, { initialValue: [] });
```

### Legacy note

RxJS 5 used prototype patching (`obs.map(...).filter(...)`). RxJS 6+ uses pipeable operators, and RxJS 7.2+ exports them from `'rxjs'` directly; `'rxjs/operators'` still works but is no longer needed.

### Pitfalls

- Nesting `subscribe()` inside `subscribe()`: use a `*Map` operator instead.
- Using `mergeMap` for search: responses can arrive out of order and show results for an older query.
- Putting `catchError` at the end of the outer pipe: the stream completes after the first error.
- `debounceTime` before `map(trim)`/`distinctUntilChanged`: fine; the reverse order would compare untrimmed values.
