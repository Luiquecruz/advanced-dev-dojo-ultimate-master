## Many tools, the same core problem

Every data library answers the same questions: where is the cache, how is it keyed, when is data refetched, and how do writes update it. TanStack Query is one answer. Here are the others you will meet.

## SWR

SWR (by Vercel) is named after the HTTP cache strategy **stale-while-revalidate**: return cached data first, then revalidate in the background.

```jsx
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((response) => response.json());

function Profile() {
  const { data, error, isLoading } = useSWR('/api/users/1', fetcher);
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p role="alert">Failed</p>;
  return <h2>{data.name}</h2>;
}
```

- The **key** is usually the URL itself and is passed to the fetcher.
- Writes use `mutate(key)` to revalidate, or `useSWRMutation` for remote mutations.
- Smaller API than TanStack Query, fewer features (no built-in query invalidation by prefix, simpler devtools story). Popular in Next.js projects.

## RTK Query

Bundled with Redux Toolkit. You define an API slice with endpoints, and it generates hooks:

```js
const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Todo'],
  endpoints: (build) => ({
    getTodos: build.query({ query: () => 'todos', providesTags: ['Todo'] }),
    addTodo: build.mutation({
      query: (title) => ({ url: 'todos', method: 'POST', body: { title } }),
      invalidatesTags: ['Todo'],
    }),
  }),
});

export const { useGetTodosQuery, useAddTodoMutation } = api;
```

Invalidation is declarative through **tags**. A natural choice when the app already uses Redux.

## GraphQL in one minute

REST exposes many endpoints that return fixed shapes. GraphQL exposes **one endpoint** and a typed **schema**; the client asks for exactly the fields it needs:

```
query UserWithPosts($id: ID!) {
  user(id: $id) {
    name
    posts {
      title
    }
  }
}
```

Benefits: no over-fetching or under-fetching, one round trip for nested data, strong typing and code generation. Costs: a server layer to build and secure, harder HTTP caching (everything is a POST to one URL), and query complexity limits.

### GraphQL clients

- **Apollo Client**: the most widespread. A **normalized cache** stores each entity once by `__typename` and `id`, so updating a user in one query updates it everywhere. Hooks: `useQuery`, `useMutation`, `useSuspenseQuery`.
- **urql**: lighter and extensible through "exchanges"; document cache by default, normalized cache (Graphcache) as an add-on.
- **Relay**: Meta's client. Components declare **fragments** of data they need; a compiler merges them into one query per route. Very powerful and opinionated, deeply integrated with Suspense.
- You can also call GraphQL with plain `fetch` inside TanStack Query, using `graphql-request` or code generated with GraphQL Code Generator.

## tRPC

For full-stack TypeScript apps, tRPC lets the client call server procedures with **end-to-end types** and no schema or code generation step. Its React integration is built on TanStack Query.

## Framework data loading

Modern frameworks move fetching out of components entirely:

- **React Router** loaders and actions run before the route renders, avoiding waterfalls.
- **Next.js App Router** fetches inside **Server Components** with `async`/`await`; the result is streamed to the client, and Server Functions handle writes.
- **TanStack Router** loaders integrate directly with TanStack Query.

With server components there is often no client data library at all for read-only pages.

## HTTP clients are a separate choice

`fetch`, **axios** and **ky** only send requests. They do not cache or dedupe. Any of them can be used inside a `queryFn`, an SWR fetcher or an RTK Query `baseQuery`. Axios was the default for years because of interceptors and automatic JSON; native `fetch` plus a small wrapper now covers most needs.

## Choosing

| Situation | Good fit |
| --- | --- |
| REST or any async source, rich features | TanStack Query |
| Simple reads, Next.js, minimal API | SWR |
| Already using Redux | RTK Query |
| GraphQL with heavy entity sharing | Apollo Client or Relay |
| Full-stack TypeScript monorepo | tRPC |
| Framework app with server rendering | Loaders, Server Components |

The legacy approach, `useEffect` plus Redux actions for each request, is what all of these replaced.
