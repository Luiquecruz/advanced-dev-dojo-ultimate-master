## What problem Server Components solve

SSR, SSG and ISR send HTML early, but every component still ships to the browser to hydrate, including the ones that only format text or read a database. Islands cut that cost by splitting the page into separate roots, at the price of losing one shared React tree. **React Server Components (RSC)** keep a single tree and move the split **inside** it: some components run only on the server and never ship to the client; others are ordinary interactive components.

| Question | Answer with RSC |
| --- | --- |
| Where is the HTML generated? | Server Components run on the server (at build time or per request); Client Components are prerendered to HTML by SSR, then hydrate |
| When? | Static routes at build time, dynamic routes per request, streamed as data resolves |
| How much JS reaches the client? | Only Client Components and their imports. Server-only code, its libraries and its data access ship **zero** bytes |

## Server Components and Client Components

In an RSC framework (Next.js App Router is the main one; React Router and others are adding support), **every component is a Server Component by default**. It can be `async`, read files, query a database or call internal services directly, with secrets that never leave the server:

```tsx
export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await database.products.find(id);
  return (
    <article>
      <h1>{product.name}</h1>
      <Markdown source={product.description} />
      <AddToCart productId={product.id} price={product.price} />
    </article>
  );
}
```

`Markdown` and its parser library never reach the browser. Server Components cannot use state, effects, event handlers or browser APIs: they render once per request (or build) and produce output, not behavior.

**Client Components** are marked with the `'use client'` directive at the top of a file. That file and **everything it imports** become part of the client bundle; they are prerendered on the server and hydrated in the browser like classic SSR:

```tsx
'use client';

import { useState } from 'react';

export function AddToCart({ productId, price }) {
  const [quantity, setQuantity] = useState(1);
  return <button onClick={() => setQuantity(quantity + 1)}>Add {quantity}</button>;
}
```

## The `'use client'` boundary

`'use client'` marks an **entry point** from the server graph into the client graph, not a single component. What may cross it:

- **Props must be serializable**: strings, numbers, booleans, `null`, arrays, plain objects, `Date`, `Map`, `Set`, promises, JSX, and Server Functions. Plain functions and class instances cannot cross.
- **Children as slots**: a Client Component cannot import a Server Component, but a Server Component can pass one **as `children` (or any JSX prop)** to a Client Component. The server renders it first and the client receives the finished output.

```tsx
<Tabs>
  <ProductReviews productId={id} />
</Tabs>
```

`Tabs` is interactive; `ProductReviews` stays server-only inside it. The rule of thumb: push `'use client'` to the **leaves** (buttons, forms, widgets), not to layouts.

## Server Functions: `'use server'`

`'use server'` marks functions the client can call over the network, often used as Server Actions for forms and mutations:

```tsx
'use server';

export async function addToCart(formData) {
  await cart.add(formData.get('productId'));
  revalidatePath('/cart');
}
```

A Client Component (or a `<form action={addToCart}>`) calls it like a function; the framework sends a POST request. Treat every Server Function as a **public endpoint**: validate input and check authorization inside it. `'use server'` does **not** mark Server Components; there is no directive for those.

## Streaming, Suspense and the RSC payload

The server renders the tree to the **RSC payload**, a compact serialized description of the tree: the output of Server Components, references to Client Component modules and their props. The framework then:

1. SSRs the payload plus Client Components into **HTML** for the first load.
2. Sends the payload alongside, so React can rebuild the tree and hydrate the Client Components.
3. On client navigation, fetches **only the payload** for the next route, with no full page reload, and merges it while keeping client state.

Wrapping slow parts in `<Suspense fallback={...}>` streams the shell first and each boundary when its data arrives, so one slow query does not block the page.

**RSC is not SSR.** SSR turns components into HTML; RSC decides **where components run**. Server Components can run at build time with no server at all, and in an RSC app SSR is just the step that turns the first payload into HTML.

## Pitfalls

- `'use client'` at the root of the app turns everything into Client Components and loses the benefit.
- Importing server-only code (database client, secrets) into a client file leaks or breaks it. The `server-only` package makes that a build error.
- Passing a whole database record as a prop serializes all of it into the page; pass only what the client needs.
- Data waterfalls move to the server: sequential `await`s in nested components still add up. Start requests in parallel or preload.
- Context providers are Client Components; wrap only the subtree that needs them.

## When to choose it

Choose RSC (in practice, Next.js App Router or a framework with RSC support) for content-heavy apps that also need rich interactivity in one tree, data close to the server and small bundles: e-commerce, media, SaaS dashboards with heavy read views. It needs a capable framework and a team ready for the server and client mental model. A simple SPA behind login, or a mostly static site (islands, SSG), may not need it.
