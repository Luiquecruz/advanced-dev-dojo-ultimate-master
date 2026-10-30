Write the build step and the static server of a blog generated at build time. Everything lives in `build.jsx`. The page components (`PostIndexPage`, `PostPage`, `NotFoundPage`), `toHtml(element)` (`<!DOCTYPE html>` plus `renderToStaticMarkup`) and `fetchJson(path)` are done.

**Build time**

- `generateStaticParams()` (async, named export): fetch `/api/posts` and return one `{ id }` per post, with `id` as a **string** (`[{ id: '1' }, { id: '2' }, ...]`). Never hard-code the list: new posts must get pages on the next build.
- `build()` (async, named export): return an object that maps each path to its HTML string:
  - `'/'`: `PostIndexPage` with every post (already in the starter),
  - `'/posts/<id>'` for every param from `generateStaticParams()`: `PostPage` with the post loaded from `/api/posts/<id>`,
  - `'/404'`: `NotFoundPage`.

**Request time**

- `createStaticServer(pages)` (named export) returns `serve(path)`, which returns `{ status, html }` by looking up the prebuilt pages. It never fetches and never renders.
  - Ignore the query string and the hash, and accept a trailing slash (`/posts/1/?ref=feed` serves `/posts/1`).
  - A built path: status `200` with its HTML.
  - Any other path, including `/404` itself: status `404` with `pages['/404']`. There is no fallback rendering for unknown ids (Next.js `dynamicParams: false`, `fallback: false` in the Pages Router).

The tests change the API with `mockApi` after the build and check that the served HTML stays the same, and that no page contains a `<script>`.
