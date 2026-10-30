## SSR's output, computed once

SSR fixed the SPA's blank screen, but it pays for a server render on **every** request, even when a blog post looks the same for every visitor all week. **Static site generation (SSG)** moves that render to **build time**: run the components once per known route, write the HTML to files, and serve those files from a CDN exactly like lesson 01. It is static hosting again, but the HTML is produced by code instead of copied by hand, so layouts are shared and content comes from data.

| Question | SSG |
| --- | --- |
| Where is the HTML generated? | On the build machine (CI) |
| When? | Once per deploy, for every known path |
| How much JS reaches the client? | Zero for pure content; the hydration bundle only if pages are interactive |

Tools: Next.js (`generateStaticParams`, `output: 'export'`), Astro, Gatsby, Eleventy, Docusaurus, React Router 7 `prerender`, and `prerender` from `react-dom/static` at the lowest level.

## The build, step by step

1. **Discover the paths.** A dynamic route such as `/posts/[id]` cannot be prerendered until the build knows which ids exist. Next.js asks `generateStaticParams()`; the Pages Router called it `getStaticPaths()`.
2. **Load the props** for each path (the post, the list for the index).
3. **Render** each page to HTML. Pages without interactivity use `renderToStaticMarkup`: no hydration markers and no script.
4. **Write** a file per path (`posts/1/index.html`) and upload the folder to a CDN.

```jsx
export async function generateStaticParams() {
  const posts = await fetchJson('/api/posts');
  return posts.map((post) => ({ id: String(post.id) }));
}
```

At request time nothing runs: the CDN looks up the file. That gives the best possible TTFB (the closest edge node answers), near-zero server cost, no server to attack, and pages that survive traffic spikes and API outages.

## Unknown paths

What happens for `/posts/99`, a post that did not exist at build time? Two policies:

- **`fallback: false`** (Next.js App Router `dynamicParams = false`): it is a `404`. The set of pages is closed until the next build. This is the pure SSG model you build in the challenge.
- **Fallback rendering** (`dynamicParams = true`, `fallback: 'blocking'`): render the missing page on demand on a server and cache it. That needs a server again, and leads to ISR in the next lesson.

## What it costs

- **Frozen data.** The HTML reflects the data at build time. A price change, a typo fix or a new post is invisible until someone rebuilds and redeploys. A CMS webhook that triggers a rebuild narrows the gap but does not close it.
- **Build time grows with pages.** 10 000 products × one fetch and one render each can turn a build into tens of minutes, and every small content change pays for the whole build. Frameworks parallelize and cache, but the curve is still linear.
- **No per-request data.** Nothing can depend on cookies, the user or the query string. Personalized parts must be fetched on the client after load (back to SPA costs for those parts) or rendered at the edge.
- **Content-heavy N+1 at build.** One request per page against your API during each build; rate limits matter.

## Pitfalls

- Hard-coding the list of paths: new content silently gets no page.
- Using `Date.now()` or "latest" data in a page and expecting it to be current.
- Mixing static and dynamic data in one page without deciding which part is allowed to be stale.
- Forgetting the `404` page: static hosts need a real file to serve with status 404.

## When to choose it

Choose SSG for content that is the same for every visitor and changes less often than you deploy: documentation, blogs, marketing and landing pages, changelogs, small catalogs. It is the fastest and cheapest way to serve React output. When pages are too many to build every time, or data must update within minutes without a deploy, use ISR (next lesson). When content depends on the request or the user, use SSR.
