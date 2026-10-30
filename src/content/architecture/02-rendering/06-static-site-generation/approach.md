1. Split the problem into the two moments of SSG: build time (fetch and render everything) and request time (look things up). Only `build` and `generateStaticParams` may touch the API.
2. Derive the paths from the data. `generateStaticParams` returns route params as strings, the same shape a URL segment has, so the build loop can turn each into `/posts/<id>`.
3. For every param, load that page's props and render it once. The output is a plain object of path → HTML: the in-memory version of the folder a real build uploads to a CDN.
4. Prebuild the not-found page as well; a static host can only serve files that exist.
5. Write `serve` as a pure function of `pages`: normalize the path the way a CDN does (no query string, no trailing slash), then return the stored string or the 404 page. No `fetch`, no rendering.
6. Check the trade-off with the tests: after the build the API can change completely and the served HTML does not move. That is the speed of SSG and its cost (frozen data) in one observation.
