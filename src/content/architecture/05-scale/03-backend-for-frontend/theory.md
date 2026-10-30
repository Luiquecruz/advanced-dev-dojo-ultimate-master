## One backend per experience

A product page often needs data from several services: users, posts, recommendations, inventory. If the browser calls each service directly, it pays several round trips, downloads fields it never shows, and embeds knowledge of the service landscape in client code. A mobile app and a TV app then repeat the same orchestration with different needs.

A **Backend for Frontend (BFF)** is a server-side API layer built **for one specific frontend**: one for the web app, one for iOS and Android, one for TV. It aggregates and shapes upstream services into exactly what that experience renders. The pattern was described by Sam Newman from his work at SoundCloud, and is used at Netflix and Spotify, where each device family has different screens, bandwidth and release cycles.

```
browser ──▶ web BFF ──┬──▶ users service
mobile  ──▶ app BFF ──┤──▶ posts service
                      └──▶ recommendations
```

## What a BFF does

- **Aggregation**: one request from the client fans out to several services, **in parallel** when the calls are independent.
- **Shaping**: it returns a **view model**, the fields the screen renders (`initials`, `latestPosts`) and nothing else. Smaller payloads, and no accidental leak of emails or internal ids.
- **Status mapping**: an upstream 404 stays a meaningful 404 for the page; an upstream crash becomes a 502 instead of a confusing 500 from the wrong layer.
- **Partial failure**: secondary data (posts, recommendations) degrades with an explicit flag, so the page still renders when one service is down.
- **Client concerns**: session cookies, auth token exchange, caching headers, feature flags per client.

```js
const [userResult, postsResult] = await Promise.all([
  readJson(`/api/users/${userId}`),
  readJson(`/api/posts?userId=${userId}`),
]);
if (userResult.status === 404) return { status: 404, body: { error: 'User not found' } };
```

`readJson` never throws: it turns network errors and HTTP errors into `{ ok, status, data }`, so one failing service cannot reject the whole `Promise.all`. `Promise.allSettled` is an alternative.

## BFF versus API gateway

An **API gateway** is generic infrastructure shared by all clients: routing, authentication, rate limiting, TLS. A BFF is **product code owned by the frontend team**, changing at the speed of the UI. They combine well: the gateway sits in front, BFFs sit behind it. When one "gateway" starts accumulating per-screen logic for every client, it has become a single shared BFF that every team must coordinate on.

## Where a BFF lives in a React stack

- **A Node service** (Hono, Express, Fastify) deployed next to the frontend.
- **Inside a meta-framework**: Next.js Route Handlers (`app/api/profile/route.ts`), Server Actions and Server Components, or React Router loaders and actions. Here the BFF is simply the server half of the app.
- **GraphQL**: a schema per client where each screen queries exactly its fields; resolvers do the aggregation.

## Risks

- **Duplicated business logic**: the web and mobile BFFs both compute discounts and drift apart. Business rules belong in domain services; a BFF only orchestrates and shapes.
- **The BFF becomes a monolith**: every team adds endpoints to one BFF until it needs its own architecture. Keep one BFF per experience and per owning team.
- **Sequential fan-out**: awaiting calls one by one adds their latencies. Start independent calls together.
- **All-or-nothing errors**: failing the page because a widget's service is down.
- **Another hop**: a BFF adds latency and an operational component; it must have timeouts, retries with backoff for idempotent reads, and monitoring.

## When to choose it

Choose a BFF when several services feed one screen, when different clients need different shapes of the same data, or when the frontend team needs to evolve its API without waiting for backend teams. In React meta-frameworks you often get one for free through route handlers, loaders or Server Components. Skip it when a single well-designed API already serves the page, or when the team cannot own and operate another server component.
