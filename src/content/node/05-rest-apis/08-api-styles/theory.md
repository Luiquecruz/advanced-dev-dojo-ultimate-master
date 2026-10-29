# API Styles

REST is one way to expose a backend. Others exist because they solve specific problems better: fetching exactly what a screen needs, sharing types with the client, fast service-to-service calls, or pushing data in real time. Choosing well means matching the style to **who the clients are** and **which direction data flows**.

## The options at a glance

| Style | Shape | Best at | Costs |
| --- | --- | --- | --- |
| **REST** | Resources + HTTP methods, JSON | Public and partner APIs, CRUD, HTTP caching, any client | Over- or under-fetching for complex screens; contracts need OpenAPI to be typed |
| **GraphQL** | One endpoint, client sends a query for exactly the fields it needs | Many clients with different needs (web, mobile), deeply related data | Server complexity, N+1 queries (DataLoader), harder HTTP caching, query cost limits needed |
| **tRPC / Hono RPC** | TypeScript functions called from the client with inferred types | Full-stack TypeScript monorepos, one team owning both sides | Couples client and server to TypeScript and to one repo; not for third parties |
| **gRPC** | Protocol Buffers over HTTP/2, generated clients, streaming | Internal service-to-service calls, polyglot backends, low latency | Not browser-native (needs gRPC-Web or Connect), binary payloads are harder to debug |
| **WebSockets** | Persistent bidirectional connection | Chat, multiplayer, collaborative editing, presence | Stateful connections: scaling, reconnection and auth are on you |
| **SSE** | One-way stream over HTTP | Progress, notifications, AI token streaming | Server to client only |
| **Webhooks** | Your server receives HTTP calls from another system when events happen | Integrations (Stripe, GitHub, payment providers) | You must verify signatures, handle retries and duplicates, and respond fast |

## REST vs GraphQL from the frontend's point of view

A product page needs the product, its reviews with author names and three related products. With REST that is several requests, or a custom endpoint shaped for the screen (a **backend-for-frontend**). With GraphQL the client writes one query:

```ts
const query = `
  query Product($id: ID!) {
    product(id: $id) { name price reviews(first: 5) { rating author { name } } }
  }
`;
```

The flexibility moves cost to the server: every field is a resolver, naive resolvers trigger N+1 database queries, and a malicious query can request deeply nested data, so production GraphQL needs batching, depth and cost limits, and persisted queries. GraphQL shines when many client teams evolve independently; for a single web app, it is often more machinery than needed.

## Typed RPC: the full-stack TypeScript shortcut

When the same team writes the React app and the API in one repository, tRPC or Hono's RPC client remove the contract layer: the client imports the server's **types** (not its code) and gets autocompletion and compile errors when the API changes. The TypeScript module builds this with Hono. The trade-off: it only works for TypeScript clients you control. As soon as a mobile team in Swift or an external partner needs the API, publish REST with OpenAPI (Hono can generate it with `@hono/zod-openapi`).

## gRPC: between services

gRPC defines services in `.proto` files and generates clients and servers in many languages. Messages are compact binary over HTTP/2 with streaming in both directions, which makes it popular for internal microservice traffic. Browsers cannot speak it directly; Connect and gRPC-Web bridge the gap. Rarely the right choice for a frontend-facing API.

## Real time: WebSockets, SSE, polling

Ask which direction data flows. Mostly server to client? **SSE** (previous lesson). Both directions with low latency? **WebSockets**. Infrequent updates? **Polling** is simple and cache-friendly. All three need extra infrastructure to scale across instances (a pub/sub broker), covered in the scaling module.

## Webhooks: APIs that call you

A webhook is an HTTP `POST` from another system to your endpoint. Production rules:

- **Verify the signature** (an HMAC of the raw body with a shared secret, compared with `timingSafeEqual`) before trusting anything.
- **Respond `2xx` fast** and process in a background job; providers time out and retry.
- **Expect duplicates and reordering**: store processed event ids and make handlers idempotent.

## When to choose it

Default to **REST + OpenAPI** for anything public, partner-facing or consumed by many languages. Add **typed RPC** for a TypeScript frontend and backend owned by one team. Pick **GraphQL** when many independent clients need different shapes of deeply related data and you can invest in its server tooling. Use **gRPC** between internal services. Choose **SSE** or **WebSockets** by data direction, and **webhooks** to receive events from third parties. Mixing is normal: REST for the public API, RPC for the web app, webhooks for Stripe, SSE for progress.

## Working with AI

State the style and the reason ("internal tRPC for our Next.js app, REST + OpenAPI for partners"), because assistants will happily generate GraphQL or WebSockets where a simpler style fits. Review checklist:

- The style matches the clients: no tRPC for third parties, no GraphQL for one screen's CRUD.
- GraphQL servers batch resolvers and limit query depth and cost.
- RPC clients import server **types** only, never server code.
- WebSocket code handles reconnection, authentication on connect and cleanup.
- Webhook handlers verify signatures on the raw body, answer fast and deduplicate events.
- Public APIs have a published contract (OpenAPI or schema) and a versioning plan.
