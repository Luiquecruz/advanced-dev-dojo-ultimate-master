Before starting, complete [Operators](/angular/operators) in the Angular track.

Requests do not finish in the order they start. Type "a", then "ab": the response for "a" can arrive **after** the one for "ab" and overwrite the better result. Concurrency decides what happens when a new action arrives while an earlier one is still running, and the RxJS flattening operators are the vocabulary for it.

## The four strategies

| Operator | New action while one is running | Use for |
| --- | --- | --- |
| `switchMap` | cancels the old one, runs the new one | search, autocomplete, route-driven loads |
| `exhaustMap` | ignores the new one until the old finishes | submit buttons, login, save |
| `concatMap` | queues the new one, runs in order | ordered writes, sequences |
| `mergeMap` | runs them all in parallel | independent uploads, fire-and-forget logging |

Choose by asking: **what should happen to the work that is already in flight?** Cancel it, protect it, line up behind it, or ignore it.

## Search with switchMap

```ts
this.queries
  .pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((text) => this.search(text).pipe(catchError(() => of([])))),
    takeUntilDestroyed(),
  )
  .subscribe((results) => this.state.set(results));
```

`debounceTime` waits for a pause in typing, `distinctUntilChanged` skips repeated text, and `switchMap` unsubscribes from the previous request, so a late response can never replace a newer one. With `HttpClient`, that unsubscribe cancels the HTTP request itself.

## Submit with exhaustMap

```ts
this.saves.pipe(exhaustMap((name) => this.save(name))).subscribe();
```

While a save is running, extra clicks are dropped. The user cannot create duplicates by double clicking.

## Errors inside the inner stream

An error that reaches the outer pipeline **terminates it**: the search box would stop working for the rest of the session. Catch errors **inside** the flattening operator so the outer stream survives:

```ts
switchMap((text) => this.search(text).pipe(catchError(() => of([]))))   // outer stays alive
```

For a failure the user should see, map it to a value (`{ error: true }`) rather than swallowing it.

## Retry and backoff

Retry transient failures only, such as network errors and 5xx, and use a delay that grows. RxJS `retry({ count: 3, delay: (error, attempt) => timer(2 ** attempt * 200) })` expresses it. Never retry a non-idempotent write unless the server can detect duplicates.

## Race conditions without RxJS

The same problem exists with `async` functions. A counter or an `AbortController` gives the same guarantee: ignore a response if a newer request has started, or abort the old fetch.

## Common mistakes

- Using `mergeMap` for search, so old responses can overwrite new ones.
- Using `switchMap` for saves; the new click cancels a save that may already have reached the server.
- Letting an inner error kill the outer pipeline.
- Debouncing without `distinctUntilChanged`, repeating identical requests.
- Subscribing inside `subscribe`.

## When to choose it

Default to `switchMap` for reads driven by changing input and `exhaustMap` for user commands. Choose `concatMap` when order matters, and `mergeMap` only when the work is truly independent.
