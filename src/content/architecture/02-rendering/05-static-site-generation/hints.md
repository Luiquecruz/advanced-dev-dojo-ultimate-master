`generateStaticParams` is one line after `fetchJson('/api/posts')`: map each post to `{ id: String(post.id) }`. In `build`, iterate over its result to decide which `/posts/<id>` pages exist.
---
Load each post with ``fetchJson(`/api/posts/${id}`)`` and render `toHtml(<PostPage post={post} />)`. `Promise.all` over the params builds the pages in parallel; `Object.fromEntries` turns `[path, html]` pairs into the map. Add `'/404': toHtml(<NotFoundPage />)`.
---
In `serve`, take `path.split(/[?#]/)[0]`, strip trailing slashes except for `/` itself, and check `path in pages`. Treat `/404` as not found too, so it is never served with status 200.
