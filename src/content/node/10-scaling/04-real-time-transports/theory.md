# Real-Time Transports

"Real time" on the web means the server tells the client something changed without the user reloading: a new chat message, a job that finished, a price update, a collaborator's cursor. HTTP was designed as request and response, so every real-time technique is a way around that. The REST module showed Server-Sent Events in Hono; this lesson is about **choosing** a transport and what each one costs when you run more than one server.

## The options

| Transport | Direction | How it works | Strengths | Costs |
| --- | --- | --- | --- | --- |
| Short polling | client asks | `fetch` every N seconds | trivial, works everywhere, stateless servers | latency up to N, wasted requests |
| Long polling | client asks, server waits | request stays open until there is data or a timeout, then the client asks again | near real-time over plain HTTP | one held request per client, reconnect churn |
| Server-Sent Events | server → client | one long HTTP response with `text/event-stream` | built-in reconnection with `Last-Event-ID`, plain HTTP, proxies understand it | one direction only, text only |
| WebSockets | both ways | HTTP upgrade to a persistent full-duplex socket | low latency, binary, bidirectional | stateful connections, custom protocol, harder through some proxies |
| WebTransport | both ways | HTTP/3 (QUIC) streams and datagrams | no head-of-line blocking, unreliable datagrams for games | newer, limited server support |
| Managed services | both ways | Pusher, Ably, Supabase Realtime, Firebase, AWS AppSync | someone else runs millions of connections | cost per message or connection, vendor lock-in |

Webhooks are the server-to-server cousin: the other service calls **your** endpoint when something happens.

## Picking one

Ask three questions:

1. **Who talks?** If only the server pushes (notifications, progress, dashboards, LLM token streaming), SSE is enough and simpler than WebSockets. The client can still send data with regular `POST` requests.
2. **How fresh and how often?** Updates every 30 seconds for 200 users: polling is fine and costs almost nothing to run. Typing indicators and multiplayer cursors: WebSockets.
3. **Who operates it?** Thousands of long-lived connections change how you deploy. If real time is not your core product, a managed service is often cheaper than the engineering time.

## What changes on the server

Long-lived connections break assumptions that request-response servers rely on:

- **Connections hold memory and file descriptors.** Each open socket costs some kilobytes; a Node process can hold tens of thousands, but limits (`ulimit`, load balancer quotas) must be raised and monitored.
- **Fan-out across instances.** With 4 instances, a user connected to instance A must receive a message produced on instance C. Instances subscribe to a **pub/sub** channel (Redis pub/sub, NATS, Postgres `LISTEN/NOTIFY` for small loads) and forward to their local connections. Socket.IO's Redis adapter does exactly this.
- **Sticky sessions.** Long polling and Socket.IO's fallback transports need the load balancer to send a client's requests to the same instance. Pure WebSockets and SSE keep a single connection, so they do not.
- **Proxies and idle timeouts.** Load balancers close idle connections (often after 60 s). Send **heartbeats** (SSE comment lines, WebSocket ping/pong) and make clients reconnect with backoff.
- **Deploys drop connections.** Every rollout disconnects clients; graceful shutdown should close them deliberately and clients must reconnect and **resume** (`Last-Event-ID`, a sequence number, or refetching state).
- **Authentication.** Browsers cannot set custom headers on a `WebSocket`. Use cookies, or send a short-lived token in the first message (not in the URL, which ends up in logs).
- **Backpressure.** A slow client cannot be allowed to grow an unbounded send buffer. Check `bufferedAmount` (or the stream's `write()` return value), drop or coalesce updates, or disconnect.

## HTTP versions matter

Over HTTP/1.1 a browser opens at most about 6 connections per origin, and each SSE stream holds one of them for good. Over HTTP/2 or HTTP/3, streams are multiplexed on one connection, which removes that limit; serve SSE behind an HTTP/2 capable proxy or CDN.

## When to choose it

Default to the simplest transport that meets the freshness requirement: polling for slow-changing data, SSE for server-to-client streams (notifications, progress, AI responses), WebSockets when the client sends frequent low-latency messages (chat, collaboration, games), and a managed service when connection count or global reach would otherwise become a project of its own. Keep the source of truth in your database and treat the real-time channel as a notification that something changed, so a client that missed messages can always refetch.

## Working with AI

Tell the assistant the direction of traffic, the expected number of concurrent connections, how many instances you run and what clients should do after a disconnect. Review generated code for:

- WebSockets used where SSE or polling would do.
- No pub/sub layer, so messages only reach clients on the same instance.
- No heartbeats, no reconnection with backoff, no resume after reconnect.
- Tokens in query strings, or no authentication on the upgrade.
- Unbounded per-connection buffers and no limit on connections per user.
- State that lives only in the socket handler instead of the database.
