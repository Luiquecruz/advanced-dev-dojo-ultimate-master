Server data has needs that a plain signal does not meet: a **cache** shared by many components, **deduplication** of identical requests, **staleness** rules, **invalidation** after writes, retries, cancellation and pagination. You can build these on `HttpClient`, RxJS and a store, or use a library that models them. This lesson explains what is being solved and how to choose.

## Client state versus server state

| | Client state | Server state |
| --- | --- | --- |
| Owner | the browser | a remote system |
| Freshness | always current | can be stale at any moment |
| Shape | you design it | the API's shape |
| Needs | updates and derivation | caching, refetch, invalidation, errors |

Treat them as different things. Copying server responses into a global client store makes you responsible for freshness the store knows nothing about.

## The vocabulary

- **Query key**: an array identifying the data (`['todos', { status: 'open' }]`). Same key, same cache entry.
- **Stale time**: how long data counts as fresh. While fresh, a read does not refetch.
- **Stale-while-revalidate**: show cached data immediately and refetch in the background.
- **Invalidation**: mark entries stale after a mutation so the next reader refetches.
- **Deduplication**: two components asking for the same key share one request.
- **Mutation**: an imperative write, with `onMutate`, `onError` and `onSettled` hooks for optimistic updates.

## Doing it by hand

With `HttpClient` you can keep a `Map<string, Observable>` using `shareReplay` for dedupe, a timestamp for staleness and manual `clear()` calls after writes. It works and teaches the problem, but each project reinvents the same edge cases: errors that are cached forever, cancellation, retries, garbage collection, background refetch on focus.

## TanStack Query for Angular

`@tanstack/angular-query-experimental` provides this model with signals:

```ts
bootstrapApplication(App, { providers: [provideHttpClient(), provideTanStackQuery(new QueryClient())] });

@Component({ /* ... */ })
class Todos {
  private readonly api = inject(TodoApi);
  private readonly queryClient = inject(QueryClient);

  readonly todos = injectQuery(() => ({
    queryKey: ['todos'],
    queryFn: () => this.api.list(),       // returns a Promise
  }));

  readonly add = injectMutation(() => ({
    mutationFn: (title: string) => this.api.add(title),
    onSuccess: () => this.queryClient.invalidateQueries({ queryKey: ['todos'] }),
  }));
}
```

In the template you read `todos.data()`, `todos.isPending()` and `todos.error()`. The package is labelled **experimental**: its API can change in minor or patch releases, so pin the version and test every upgrade.

## Choosing

| Situation | Reasonable choice |
| --- | --- |
| One screen, one request | `httpResource` or `resource` |
| A few reads, simple refresh | a signal service with `HttpClient` |
| Many screens sharing data, background refetch, pagination, mutations | a query library |
| A store already owns normalized entities for business rules | keep the server calls in effects or methods; do not also add a query cache for the same data |

## One source of truth

The most common architecture bug is caching the same API response in a query cache **and** in a global store. Pick one owner. If a query library owns the list, components read the query; a store keeps only client state (selection, filters, drafts) and the ids that point into the query data.

## Common mistakes

- Putting API data in NgRx state and also in a query cache.
- Using unstable query keys (objects created differently each time) that defeat caching.
- Invalidating everything after every write instead of the affected keys.
- Choosing a library for one screen that `resource()` handles.
- Relying on an experimental API without pinning its version.

## When to choose it

Add a query library when you notice yourself writing cache, refetch, retry or invalidation logic. Until then, signals with `resource` are less code and one less dependency.
