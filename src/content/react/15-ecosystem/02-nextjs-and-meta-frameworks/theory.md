## Why a framework?

React is a UI library. A production app also needs routing, data loading without waterfalls, code splitting, server rendering, caching, bundling and deployment. react.dev recommends starting new apps with a **framework** (or with Vite plus a router when you truly want a client-only SPA). Create React App was deprecated in February 2025.

## Next.js (App Router)

Next.js by Vercel is the most widely used React framework and the reference implementation of **Server Components**.

```
app/
  layout.tsx          # root layout (Server Component by default)
  page.tsx            # route "/"
  blog/[slug]/page.tsx
  blog/[slug]/loading.tsx   # Suspense fallback
  api/health/route.ts       # Route Handler (GET, POST...)
proxy.ts              # request interception (formerly middleware.ts)
```

```tsx
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await db.post.find(slug);
  return <article>{post.title}</article>;
}
```

- **Server Components by default**: they can be `async`, read the database directly and ship zero JavaScript. Add `'use client'` to files with state, effects or event handlers.
- **Server Functions** (`'use server'`) handle mutations from forms and buttons.
- **Nested layouts**, `loading.tsx` and `error.tsx` map directly onto Suspense and error boundaries.

### What changed in Next.js 16 (October 2025)

- **Turbopack is the default bundler** for `next dev` and `next build` (`--webpack` opts out).
- **Cache Components**: with `cacheComponents: true`, caching is **opt-in** through the `'use cache'` directive on pages, components or functions. Everything else runs at request time, and Partial Prerendering serves a static shell with dynamic holes streamed via Suspense. This replaces the implicit caching of earlier App Router versions.
- **New caching APIs**: `updateTag()` (read-your-writes inside Server Actions), `refresh()`, and `revalidateTag(tag, profile)` with a `cacheLife` profile.
- **`proxy.ts` replaces `middleware.ts`** and runs on the Node.js runtime.
- `params`, `searchParams`, `cookies()` and `headers()` are **async only**.
- Built-in **React Compiler** support is stable (opt-in with `reactCompiler: true`).
- Requires Node.js 20.9+. AMP support and `next lint` were removed.

**Legacy vs modern.** The **Pages Router** (`pages/`, `getServerSideProps`, `getStaticProps`, `_app.tsx`) still works and you will meet it in older codebases, but new features land in the App Router.

## React Router framework mode (Remix)

Remix merged into React Router: v7 introduced **framework mode**, a Vite plugin that adds file-based or config-based routes, type-safe route modules, SSR, SPA and static prerendering. Version 8 continues the line and makes middleware standard.

```ts
// app/routes.ts
import { index, route } from '@react-router/dev/routes';

export default [index('./home.tsx'), route('products/:pid', './product.tsx')];
```

```tsx
// app/product.tsx
export async function loader({ params }: Route.LoaderArgs) {
  return { product: await getProduct(params.pid) };
}

export default function Product({ loaderData }: Route.ComponentProps) {
  return <h1>{loaderData.product.name}</h1>;
}
```

`loader` and `action` exports run on the server (or `clientLoader` in the browser), so data loads in parallel per route before rendering: no fetch-in-effect waterfalls. The same package also works in **data mode** (`createBrowserRouter`) and **declarative mode** (`<BrowserRouter>`) for apps that bring their own server.

## Other options

| Framework | Highlights |
| --- | --- |
| **TanStack Start** | Full-stack framework on TanStack Router: end-to-end type-safe routes, server functions, SSR/streaming, built on Vite |
| **Astro** | Content-first, ships zero JS by default; React components hydrate as interactive **islands** |
| **Expo (Expo Router)** | File-based routing for iOS, Android and web from one codebase |
| **Waku** | Minimal framework focused on Server Components |
| **Vite + React Router / TanStack Router** | Client-only SPA when SEO and SSR do not matter |

## Choosing

- Content site or blog: Astro or Next.js with static generation.
- Full-stack product, Server Components, Vercel or Node hosting: Next.js.
- Web-standards loaders and actions, gradual adoption from an existing React Router app: React Router framework mode.
- Maximum type safety in routing and search params: TanStack Start.
- Internal dashboard behind login: Vite SPA is often enough.

## Pitfalls

- Marking every file `'use client'` throws away the benefits of Server Components; push client boundaries down to the leaves.
- Importing server-only code (database clients, secrets) into Client Components. Use the `server-only` package to fail the build.
- Assuming data is cached (or not): with Cache Components, nothing is cached unless you say `'use cache'`.
- Server Functions are public HTTP endpoints: always validate input and check authorization.
