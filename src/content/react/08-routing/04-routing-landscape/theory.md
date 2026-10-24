## Routing is an architecture decision

The router decides much more than which component renders for a URL. It shapes how data loads, how code is split, whether pages render on the server, and how type-safe your links are. The React team recommends starting new apps with a **framework** (a router plus data loading, bundling and rendering strategies) and dropping to a plain library only when you have a reason.

## React Router 7: three modes in one package

In late 2024 Remix merged into React Router. Version 7 offers the same routing core with increasing features:

| Mode | Setup | Adds |
| --- | --- | --- |
| **Declarative** | `<BrowserRouter>` + `<Routes>` | URL matching, links, params |
| **Data** | `createBrowserRouter` + `<RouterProvider>` | loaders, actions, `useFetcher`, pending UI, error elements |
| **Framework** | Vite plugin `@react-router/dev`, `app/routes.ts` | SSR, SPA or static pre-rendering, automatic code splitting, generated route types (`Route.LoaderArgs`), `clientLoader`, server `action`s |

```ts
// app/routes.ts (framework mode)
import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('posts/:postId', 'routes/post.tsx'),
] satisfies RouteConfig;
```

You can adopt it incrementally: an app written in declarative mode can move to data mode and then to framework mode without rewriting its components. Remember to keep it updated: React Router's RSC support was among the packages affected by the December 2025 React Server Components security advisories.

## TanStack Router

TanStack Router is a client-first router built around **end-to-end type safety**:

- Route params, **search params** and loader data are fully typed; `<Link to="/posts/$postId" params={{ postId: 1 }}>` is checked by TypeScript, so a renamed route breaks the build instead of production.
- Search params are treated as validated, typed state (`validateSearch` with Zod or similar), ideal for filters and pagination.
- Built-in loaders with caching (SWR-style), preloading on hover, and tight integration with TanStack Query.
- File-based routing through a bundler plugin, or code-based routes.
- **TanStack Start** builds a full-stack framework (SSR, server functions, streaming) on top of it.

## Next.js App Router

Next.js routes come from the **file system** in the `app/` directory, and components are **Server Components by default**:

```
app/
  layout.tsx          shared layout (persists across navigations)
  page.tsx            /
  posts/
    [postId]/
      page.tsx        /posts/:postId
      loading.tsx     Suspense fallback for the segment
      error.tsx       error boundary for the segment
```

Data is fetched by `async` Server Components instead of loaders; mutations use Server Functions (`'use server'`). It offers SSR, static generation, streaming and incremental revalidation, and requires a Node or edge server for dynamic features. The older **Pages Router** (`pages/` directory, `getServerSideProps`) still exists in legacy apps.

## Other options

- **Wouter**: a tiny (≈2 kB) hook-based router for small SPAs.
- **Expo Router**: file-based routing for React Native and web.
- Frameworks such as **Waku** and **RedwoodSDK** combine routing with React Server Components.

## How to choose

| Situation | Good fit |
| --- | --- |
| Existing SPA, minimal change | React Router declarative or data mode |
| Full-stack app with SSR, progressive enhancement, deploy anywhere | React Router framework mode |
| Heavy client app with complex URL state, strict TypeScript | TanStack Router (or TanStack Start) |
| Server Components, static + dynamic rendering, Vercel ecosystem | Next.js App Router |
| Tiny widget or prototype | Wouter or React Router declarative |

## Old way

Before data routers, routing libraries only matched URLs. Data fetching lived in effects (or Redux thunks), causing waterfalls, and SSR required custom setups such as `react-router-config` plus `getInitialProps`. Modern routers make data loading, code splitting and rendering strategy part of the route itself.
