## The problem SSG left behind

Static site generation gave us HTML on a CDN with a tiny TTFB, but it froze the data at build time. A price change waits for the next deploy, and a catalog with 200 000 products turns every build into a long job. Server-side rendering fixes freshness, but pays a render on every request.

**Incremental Static Regeneration (ISR)**, the name Next.js gave it, sits in between: pages are still static HTML served from a cache, but each one is **regenerated individually, after it is generated**, without rebuilding the site.

| Question | Answer with ISR |
| --- | --- |
| Where is the HTML generated? | On the server, by the same render function SSG uses |
| When? | At build time (or on the first request) and again whenever a page is revalidated |
| How much JS reaches the client? | The same as SSG: the hydration bundle of the page |

## Stale-while-revalidate

ISR borrows the semantics of the HTTP `Cache-Control: stale-while-revalidate` directive. Each cached page has an age and a revalidation window:

1. **First request** for a path that was never generated: render it, store it, answer (`MISS`). Next.js can also prebuild popular paths at build time.
2. **Inside the window**: serve the cached HTML without rendering (`HIT`).
3. **After the window expires**: the next visitor still gets the **old** HTML immediately (`STALE`), and that request **triggers a regeneration in the background**. Visitors after it receive the new page once it is ready.

The first visitor after expiry never waits for a render, which keeps TTFB static-like. The price is that this visitor sees content that is already out of date.

```jsx
async function get(path) {
  const page = cache.get(path);
  if (!page) return { html: await renderAndStore(path), cache: 'MISS' };
  if (isFresh(page)) return { html: page.html, cache: 'HIT' };
  regenerateInBackground(path);
  return { html: page.html, cache: 'STALE' };
}
```

Two details make this production-grade:

- **Deduplication.** A popular page that expires receives many requests at once. Only one regeneration may run per path; the others keep serving the stale copy. Without this, expiry turns into a thundering herd against the CMS or database.
- **Failure keeps the last good page.** If the regeneration throws (CMS down, timeout), the cached HTML stays. The page is not replaced by an error, and the next request after the failure tries again.

## Time-based vs on-demand revalidation

**Time-based**: every page gets a lifetime in seconds.

```tsx
// Next.js App Router
export const revalidate = 60;

const product = await fetch(`https://cms.example.com/products/${id}`, {
  next: { revalidate: 60, tags: ['products'] },
}).then((response) => response.json());
```

The Pages Router expressed the same idea as `getStaticProps` returning `{ props, revalidate: 60 }`.

**On-demand**: something that knows the data changed invalidates the page. Typically the CMS calls a webhook when an editor publishes, and the handler calls `revalidatePath('/products/42')` or `revalidateTag('products', 'max')` to invalidate every page that fetched with that tag. Since Next.js 16 `revalidateTag` requires that cache profile argument (`'max'` serves stale content while it regenerates), and `updateTag` covers read-your-own-writes inside Server Actions: the next request waits for fresh data. On-demand lets you use a long window (or none) and still publish within seconds.

Choosing the window is a product decision: how stale may this page be, and how expensive is a render? A news home page might use 30 seconds, a product page 5 minutes plus a webhook on price change, a docs page a day.

## Risks and pitfalls

- **The stale window is real.** With `revalidate: 600`, a price change may show the old price for up to ten minutes plus one request. Never use ISR alone for data that must be exact (stock at checkout, account balance); fetch that on the client or the server per request.
- **Cross-page inconsistency.** Each page regenerates on its own schedule. The listing may show the new price while the product page still shows the old one. Tag-based invalidation of every page that uses the data reduces this.
- **Low-traffic pages stay stale longer**: regeneration needs a request to trigger it.
- **Personalization does not fit**: the cached HTML is shared by every visitor. Personal parts belong in client components or a separate request.
- **Hosting**: ISR needs a server or platform that stores and regenerates pages (Vercel, a Node server, OpenNext adapters). A pure static export cannot do it.

## When to choose it

Choose ISR for pages that many visitors see identically, change occasionally, and where a short delay is acceptable: catalogs, product pages, blogs with frequent edits, CMS-driven marketing. Prefer plain SSG when data changes only with deploys, SSR when every request must be fresh or personalized, and client fetching for small live fragments (stock, cart) on top of an ISR page.
