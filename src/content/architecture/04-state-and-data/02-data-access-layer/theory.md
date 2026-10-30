## The problem: `fetch` everywhere

In a young codebase every component that needs data writes its own request:

```jsx
const { data } = useQuery({
  queryKey: ['product-search', term],
  queryFn: () => fetch(`/api/products?q=${term}`).then((response) => response.json()),
});
```

It works until the codebase grows. Then the base URL is repeated in forty files, a 500 response is parsed as if it were data (`fetch` only rejects on network failures), two screens cache the same resource under different keys, and nobody can refresh "all products" after a mutation because nobody knows every key. The cause is architectural: **network access has no owner**.

A **data access layer** gives it one. It has three parts, each with a single responsibility.

## 1. The API client (shared)

One module knows how to talk HTTP: base URL, headers, authentication, serialization and how failures look.

```js
export const API_BASE_URL = '/api';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new ApiError(response.status, `GET ${path} failed with status ${response.status}`);
  return response.json();
}
```

Mapping every non-2xx response to a **typed error** is the key move. The UI can branch on `error.status` (401 → login, 404 → not found page, 5xx → retry) without ever seeing a `Response`. Later you can add token refresh, request ids or a switch from `fetch` to another transport in one file. In a feature-sliced project this lives in `shared/api`, because it has no business knowledge.

## 2. Query definitions per feature

Each feature owns the description of its remote resources: which keys exist, which function loads them and how fresh they stay. With TanStack Query v5 the idiom is a **query factory** built with `queryOptions`:

```js
import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../../shared/api/client';

export const productQueries = {
  all: () => queryOptions({ queryKey: ['products'] }),
  list: (searchTerm) =>
    queryOptions({
      queryKey: [...productQueries.all().queryKey, 'list', { search: searchTerm }],
      queryFn: () => apiGet(`/products?q=${encodeURIComponent(searchTerm)}`),
    }),
  detail: (id) =>
    queryOptions({
      queryKey: [...productQueries.all().queryKey, 'detail', id],
      queryFn: () => apiGet(`/products/${id}`),
    }),
};
```

- **Hierarchical keys.** Every key starts with the root, so `invalidateQueries({ queryKey: productQueries.all().queryKey })` refreshes every list and detail after a mutation, and `productQueries.detail(3).queryKey` targets one entry.
- **Key and function travel together.** `queryOptions` returns its argument (typed, in TypeScript), so callers cannot pair a key with the wrong function. The same object works with `useQuery`, `useSuspenseQuery`, `prefetchQuery`, `fetchQuery` and `getQueryData`.
- **The feature owns it.** `features/products/api.js` is the only place that knows product URLs. Other features import `productQueries` through the public API (`features/products/index.js`), never a URL.

## 3. Components consume hooks

```jsx
const productsQuery = useQuery(productQueries.list(searchTerm));
```

Components never call `fetch` and never invent keys. Many teams add one more thin layer of custom hooks (`useProducts(searchTerm)`) when a query needs extra logic, but the factory alone already removes the duplication. The rule is easy to enforce: a lint rule or an architecture test that fails when `fetch(` appears outside `shared/api`.

How the cache itself behaves (staleness, `select`, dependent queries, mutations) is covered in the React State Management track; this lesson is about **where** the code lives.

## Pitfalls

- **Generic `useApi(url)` hooks.** They hide the URL in components again and make keys strings. Resources belong to features, not to a universal hook.
- **Swallowing errors in the client.** Returning `null` on failure turns every error into "no data". Throw a typed error and let the query report it.
- **Keys without the parameters.** `['products', 'list']` for every search term serves the wrong cached list. Every input of `queryFn` goes in the key.
- **One giant `api.js` for the whole app.** It becomes a shared dumping ground; split by feature and keep only transport in `shared`.

## When to choose it

Introduce a data access layer as soon as a second component talks to the same backend; it is cheap and pays off quickly. Use an OpenAPI or GraphQL code generator for the client when the backend publishes a schema, and keep feature query factories on top of it. A tiny prototype with one screen can call `fetch` in a hook, but move it into the layer before the second feature arrives.
