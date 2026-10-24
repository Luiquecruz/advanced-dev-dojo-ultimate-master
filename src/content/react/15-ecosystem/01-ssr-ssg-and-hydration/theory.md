## Where does the HTML come from?

**Client-side rendering (CSR).** The server sends an almost empty `<div id="root">` plus a JavaScript bundle. The browser downloads, parses and runs it, and only then does any content appear. Simple to host, but slow first paint on weak devices and poor for crawlers that do not run JavaScript.

**Server-side rendering (SSR).** On each request the server runs your components and sends real HTML. Users see content immediately; the JavaScript then **hydrates** that HTML to make it interactive.

**Static site generation (SSG) / prerendering.** The same rendering happens **at build time**. Every visitor gets the same prebuilt HTML from a CDN. Perfect for docs, blogs and marketing pages. **ISR** (incremental static regeneration) rebuilds pages in the background after a timeout or on demand.

| Strategy | HTML produced | Good for |
| --- | --- | --- |
| CSR | in the browser | dashboards behind login |
| SSR | per request | personalized or fast-changing pages |
| SSG | at build time | content that changes rarely |
| Streaming SSR + Suspense | per request, in chunks | pages with slow data sections |

Server Components add another dimension (components that **only** run on the server and never hydrate), covered in the React 19 module.

## Rendering on the server

`react-dom/server` turns a tree into HTML:

```jsx
import { renderToString } from 'react-dom/server';

const html = renderToString(<App initialCount={3} />);
// '<main><h1>Server rendered counter</h1>...<button>Count: <!-- -->3</button></main>'
```

No effects run, no event handlers are attached, state never updates: the output is a snapshot. The `<!-- -->` comments separate adjacent text nodes so the client can match them later.

**Legacy vs modern.** `renderToString` is synchronous and cannot wait for data: a suspended boundary is sent as its fallback. Modern servers use **streaming** APIs, `renderToPipeableStream` (Node) or `renderToReadableStream` (Web Streams, edge runtimes), which send the shell first and stream each `<Suspense>` boundary as its data resolves. For SSG, `prerender` / `prerenderToNodeStream` from `react-dom/static` wait for all data. In practice a framework (Next.js, React Router, TanStack Start) calls these for you.

## Hydration

On the client you do **not** call `createRoot().render()`: that would throw away the server HTML and rebuild the DOM. Instead:

```jsx
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document.getElementById('root'), <App initialCount={3} />);
```

React renders the same tree in memory, walks the existing DOM, **adopts** its nodes and attaches event listeners. Before hydration finishes the page is visible but buttons do nothing. With Suspense, React hydrates sections independently and prioritizes the part the user interacts with (selective hydration). The legacy API was `ReactDOM.hydrate`, removed in React 19.

## Hydration mismatches

Hydration assumes the client's first render produces **exactly** the server's output. Common breakers:

- `Math.random()`, `Date.now()`, `new Date().toLocaleString()` (server and browser time zones differ).
- Branching on `typeof window !== 'undefined'` during render.
- Reading `localStorage` or `window.innerWidth` during render.
- Invalid HTML nesting (`<div>` inside `<p>`), which the browser silently repairs.

Fixes: use `useId()` for ids (stable across server and client), pass the same data to both sides (serialize it into the page), and move browser-only values into an Effect so they apply **after** hydration:

```jsx
const [width, setWidth] = useState(null);
useEffect(() => setWidth(window.innerWidth), []);
```

For text that legitimately differs (a timestamp) add `suppressHydrationWarning` to that one element. In React 19, text mismatches make React discard the server HTML up to the nearest Suspense boundary and render on the client, and attribute mismatches are only logged: both cost performance and are bugs.

## Pitfalls

- Sending data twice: the HTML plus the same data serialized for hydration. Server Components reduce this.
- Escaping: when you embed initial state with `JSON.stringify` into a `<script>`, escape `<` so `</script>` inside data cannot break out (see the security lesson).
- Large hydration cost: SSR improves first paint, not interactivity. Ship less JavaScript.
