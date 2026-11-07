Before starting, complete [signal, computed & effect](/angular/signal-computed-effect) in the Angular track and the first two lessons of this module.

`resource()` connects asynchronous loading to the signal graph. You describe **which request** with a reactive `params` function and **how to load it** with a `loader`; Angular reloads when the params change and exposes the outcome as signals. It replaces the hand-written "loading flag plus effect plus promise" combination.

## The shape

```ts
readonly id = signal<number | null>(1);

readonly product = resource({
  params: () => {
    const id = this.id();
    return id === null ? undefined : { id };
  },
  loader: ({ params, abortSignal }) => this.fetchProduct(params.id, abortSignal),
});
```

- `params` is reactive: it re-evaluates when the signals it reads change.
- Returning `undefined` from `params` leaves the resource **idle**: no request is made.
- `loader` receives the current `params` and an `AbortSignal`. Pass it to `fetch` so an obsolete request is cancelled when the params change.
- The result is a `ResourceRef` with `value`, `status`, `error`, `isLoading` and `hasValue()`, all signals or signal-like.

## Status values

| Status | Meaning |
| --- | --- |
| `idle` | no params, nothing to load |
| `loading` | first load for these params |
| `reloading` | `reload()` is running and the old value is kept |
| `resolved` | the loader returned a value |
| `error` | the loader threw; `error()` has it |
| `local` | the value was set locally with `set` or `update` |

Reading `value()` while the resource is in `error` throws. A `defaultValue` only covers the time before a value exists (idle and the first load), not the error state, so check `hasValue()` or `status()` before reading, or read `error()` for the failure.

## Local edits and reload

A resource is writable: `product.set(next)` or `product.update(...)` change the value locally and switch the status to `local`, which is how an optimistic update starts. `product.reload()` runs the loader again with the same params.

## Related APIs

- `httpResource(() => url)` from `@angular/common/http` builds a resource over `HttpClient`, with interceptors, and parses the response.
- `rxResource` (in `@angular/core/rxjs-interop`) takes a `stream` function that returns an Observable. The Observable must emit a value or an error before it completes: one that completes empty, for example after `catchError(() => EMPTY)`, makes Angular throw.
- Check the stability label of each API in the documentation of your Angular version before relying on it in a production app.

## Against a hand-written store

A resource does one request per params value. It does not cache across different params or components, dedupe the same request from two places or know about staleness. If you need those, a query library (next lessons) or your own cache layer sits above it. For one component reading one value, a resource is the least code.

## Common mistakes

- Reading `value()` while in `error` without checking, which throws even when a `defaultValue` is set.
- Ignoring `abortSignal`, so cancelled params still finish and waste bandwidth.
- Creating a `resource` outside an injection context without passing `injector`.
- Expecting identical params in two components to share one request.
- Writing an `effect` to trigger the load; the `params` function is the trigger.

## When to choose it

Use `resource()` for a read that depends on signals (route id, selected item). Use a mutation flow, not a resource, for writes.
