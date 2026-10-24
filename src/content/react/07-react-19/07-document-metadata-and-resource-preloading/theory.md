## Metadata where the content lives

A blog post knows its own title and description, but those tags belong in `<head>`, far away from the component tree. Before React 19 you needed effects (`document.title = ...`) or a library like `react-helmet` that collected tags and synced them to the head.

React 19 supports `<title>`, `<meta>` and `<link>` **anywhere** in the tree and hoists them into `document.head` automatically:

```jsx
function BlogPost({ post }) {
  return (
    <article>
      <title>{`${post.title} | My Blog`}</title>
      <meta name="description" content={post.excerpt} />
      <meta name="author" content={post.author} />
      <link rel="canonical" href={`https://example.com/posts/${post.slug}`} />
      <h1>{post.title}</h1>
    </article>
  );
}
```

When the component unmounts, React removes the tags again. It works on the client, in streaming SSR and in Server Components.

### Pitfall: `<title>` needs one string child

```jsx
<title>{post.title} | My Blog</title>            // ❌ two children: an array
<title>{`${post.title} | My Blog`}</title>       // ✅ one string
```

JSX turns `{post.title} | My Blog` into an array of children. The browser's `<title>` only accepts text, so React warns and the result is wrong. Always build a single string with a template literal.

Other caveats:

- Render **one** `<title>` at a time; if several components render one, the last committed wins, which is hard to reason about.
- `<meta itemProp>` is not hoisted (it describes the surrounding content).
- For complex merging rules (defaults, overrides per route), routers and frameworks still offer metadata APIs built on top of this.

## Stylesheets and scripts

`<link rel="stylesheet" href="..." precedence="default" />` is also supported. With `precedence`, React inserts the stylesheet in order, deduplicates it, and **suspends** the reveal of the content until it has loaded. `<script async src="...">` is deduplicated too.

## Resource preloading APIs

`react-dom` exposes functions that tell the browser about resources it will need soon. Call them during render or in event handlers:

```jsx
import { prefetchDNS, preconnect, preload, preinit } from 'react-dom';

function App() {
  prefetchDNS('https://images.example.com');
  preconnect('https://api.example.com');
  preload('/fonts/inter.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  preinit('/scripts/analytics.js', { as: 'script' });
  return <Page />;
}
```

| Function | Effect |
| --- | --- |
| `prefetchDNS(href)` | resolve the domain's DNS early |
| `preconnect(href)` | open the connection (DNS + TCP + TLS) |
| `preload(href, { as })` | download a font, image, style or script without running it |
| `preinit(href, { as })` | download **and** execute a script or insert a stylesheet |
| `preloadModule` / `preinitModule` | same for ES modules |

React deduplicates every call and inserts the matching `<link>` tags into the head, so calling `preload` on every render is cheap.

### Old way

```jsx
useEffect(() => {
  document.title = `${post.title} | My Blog`;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = '/fonts/inter.woff2';
  link.as = 'font';
  document.head.appendChild(link);
  return () => link.remove();
}, [post.title]);
```

Effects only run after the first paint and never during SSR, so crawlers and the browser's preload scanner learn about the resources late. The declarative versions work during server rendering and are deduplicated across components.
