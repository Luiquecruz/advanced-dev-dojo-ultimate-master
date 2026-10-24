## Server cache inside the Redux store

RTK Query is Redux Toolkit's data fetching and caching layer. It solves the same problems as TanStack Query (dedup, staleness, invalidation, loading states), but its cache lives in a **Redux slice** and its invalidation model is **declarative tags**. If an app already uses Redux Toolkit, RTK Query avoids a second state system and shows every request in the Redux DevTools.

## Defining an API

```js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const todosApi = createApi({
  reducerPath: 'todosApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Todo'],
  endpoints: (build) => ({
    getTodos: build.query({
      query: () => '/todos',
      providesTags: (result = []) => [
        { type: 'Todo', id: 'LIST' },
        ...result.map(({ id }) => ({ type: 'Todo', id })),
      ],
    }),
    updateTodo: build.mutation({
      query: ({ id, ...patch }) => ({ url: `/todos/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Todo', id }],
    }),
  }),
});

export const { useGetTodosQuery, useUpdateTodoMutation } = todosApi;
```

`createApi` generates a reducer, a middleware, and a hook per endpoint (`use<Name>Query`, `use<Name>Mutation`, plus lazy variants). Mount both in the store:

```js
export function makeStore() {
  return configureStore({
    reducer: { [todosApi.reducerPath]: todosApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(todosApi.middleware),
  });
}
```

Without the middleware, cache lifetimes, polling and tag invalidation do not run (RTK throws a descriptive error in development).

## Tags: who provides, who invalidates

- A query **provides** tags describing what it contains.
- A mutation **invalidates** tags; every active query providing a matching tag refetches automatically.
- `{ type: 'Todo', id: 'LIST' }` is a convention for "the collection itself": creating a todo invalidates `LIST`, so lists refetch but detail queries do not.
- Per-id tags make updates surgical: patching todo 2 refetches the list (it provides `Todo:2`) and `getTodo(2)`, but not `getTodo(3)`.
- Invalidating just `'Todo'` (a string) hits every query providing any `Todo` tag.

## Using the hooks

```jsx
const { data = [], isLoading, isFetching, error } = useGetTodosQuery();
const [updateTodo, { isLoading: isSaving }] = useUpdateTodoMutation();

await updateTodo({ id: 2, completed: true }).unwrap();
```

- Arguments are part of the cache key: `useGetTodoQuery(2)` and `useGetTodoQuery(3)` are separate entries. Pass `skipToken` (or `{ skip: true }`) to wait for an argument.
- `selectFromResult` subscribes a component to part of a result: `useGetTodosQuery(undefined, { selectFromResult: ({ data }) => ({ remaining: data?.filter((t) => !t.completed).length }) })`.
- Options such as `pollingInterval`, `refetchOnMountOrArgChange`, `refetchOnFocus` (with `setupListeners(store.dispatch)`) control freshness; `keepUnusedDataFor` (default 60 s) controls garbage collection.

## Optimistic updates

```js
async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
  const patchResult = dispatch(
    todosApi.util.updateQueryData('getTodos', undefined, (draft) => {
      const todo = draft.find((item) => item.id === id);
      if (todo) Object.assign(todo, patch);
    }),
  );
  try {
    await queryFulfilled;
  } catch {
    patchResult.undo();
  }
}
```

`updateQueryData` uses Immer drafts and returns a patch you can `undo()`: the same snapshot/rollback idea as TanStack Query's `onMutate`.

## Custom base queries

A `baseQuery` is any function `(args, api, extraOptions) => { data } | { error }`. `fetchBaseQuery` is the default; custom ones wrap axios, GraphQL clients, auth refresh logic or retries (`retry(baseQuery, { maxRetries })`).

## RTK Query vs TanStack Query

| | RTK Query | TanStack Query |
| --- | --- | --- |
| Cache lives in | Redux store | `QueryClient` |
| Invalidation | declarative tags on endpoints | imperative `invalidateQueries` by key prefix |
| API definition | centralized `createApi` | colocated `queryOptions` |
| Devtools | Redux DevTools (actions, state) | TanStack Query Devtools |
| Extras | codegen from OpenAPI, integrates with slices and listeners | infinite queries, fine-grained observer options, framework adapters |

## When to use it / when not to

**Use RTK Query** when the app already uses Redux Toolkit, when you want endpoints defined in one place (or generated from an OpenAPI schema), and when declarative tag invalidation across many screens matches your API's resource model.

**Prefer TanStack Query** in apps without Redux (adding a store just for fetching is overhead), when you need its richer per-observer options or infinite queries, or when features colocate their own queries. Never mirror RTK Query results into hand-written slices: select from the API state instead.
