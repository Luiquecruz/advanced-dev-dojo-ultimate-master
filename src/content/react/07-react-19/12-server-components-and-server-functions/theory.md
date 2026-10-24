## Components that only run on the server

**React Server Components (RSC)** render ahead of time, on the server or at build time, and send the result to the browser as a serialized React tree, not as JavaScript. Their code never ships to the client. They require a framework or bundler integration (Next.js App Router, React Router framework mode, Waku, Parcel, the Vite RSC plugin), so they cannot run in this sandbox; this lesson is theory only.

```jsx
// app/posts/page.jsx — a Server Component (the default in RSC frameworks)
import db from './db';

export default async function PostsPage() {
  const posts = await db.posts.findMany();
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

- They can be **`async`** and `await` data directly: no effects, no loading state for the first render.
- They can read files, databases and secrets, because the code stays on the server.
- They **cannot** use state, effects, event handlers or browser APIs (`useState`, `useEffect`, `onClick`, `window`).

## `'use client'`: the boundary

Interactive pieces are **Client Components**. The `'use client'` directive at the top of a file marks the boundary: that module and everything it imports are bundled for the browser.

```jsx
'use client';
import { useState } from 'react';

export default function LikeButton({ initialLikes }) {
  const [likes, setLikes] = useState(initialLikes);
  return <button onClick={() => setLikes(likes + 1)}>{likes} likes</button>;
}
```

A Server Component can render a Client Component and pass it **serializable** props: strings, numbers, plain objects, arrays, Dates, Maps, Sets, Promises, JSX, and Server Functions. Regular functions and class instances cannot cross the boundary. A Client Component cannot import a Server Component, but it can receive one as `children`.

Passing a Promise lets the server start fetching and the client finish with `use(promise)` inside `<Suspense>`.

## `'use server'`: Server Functions

A **Server Function** is an async function marked with `'use server'`. The client receives a reference; calling it sends a network request that runs the function on the server.

```jsx
// actions.js
'use server';

export async function createTodo(formData) {
  const title = formData.get('title');
  await db.todos.create({ title });
}
```

```jsx
'use client';
import { createTodo } from './actions';

export function TodoForm() {
  return (
    <form action={createTodo}>
      <input name="title" />
      <button>Add</button>
    </form>
  );
}
```

Used as a form `action`, they work with `useActionState`, `useFormStatus` and `useOptimistic`, and even before hydration (progressive enhancement). `'use server'` marks functions, **not** Server Components: Server Components need no directive.

## Security: Server Functions are public endpoints

Anyone can call a Server Function with any arguments, just like an API route. Always validate input (for example with Zod), check authentication and authorization inside the function, and never trust hidden form fields.

In **December 2025** the React team disclosed critical vulnerabilities in the `react-server-dom-*` packages that implement RSC:

- **CVE-2025-55182** ("React2Shell", CVSS 10.0, Dec 3): unauthenticated **remote code execution** through crafted payloads sent to Server Function endpoints, during deserialization.
- **CVE-2025-55184** and **CVE-2025-67779** (Dec 11, High): denial of service via infinite loops while deserializing; **CVE-2026-23864** (Jan 2026) covered the remaining DoS cases.
- **CVE-2025-55183** (Medium): a crafted request could return a Server Function's **source code**, exposing hardcoded secrets.

Apps were affected if their framework supported RSC, even without any Server Function. Fixes landed in 19.0.4, 19.1.5 and 19.2.4 (earlier patch releases were incomplete), plus framework releases. Lessons: keep React and your framework patched, keep secrets in environment variables rather than source code, and don't rely on hosting mitigations alone.

## React 19.3 additions

- `<Context value>` can be rendered directly in Server Components when the context is imported from a `'use client'` module, so you no longer need a wrapper Provider component.
- `<Activity>` is supported in the RSC payload, and `Error.cause` and `AggregateError.errors` are sent to the client.
- `cacheSignal()` (19.2) aborts work tied to `cache()` when a server render finishes or fails.
- React DOM now supports **Trusted Types**: `TrustedHTML` values passed to `dangerouslySetInnerHTML` are no longer coerced to strings, so a `require-trusted-types-for 'script'` CSP works with React.
