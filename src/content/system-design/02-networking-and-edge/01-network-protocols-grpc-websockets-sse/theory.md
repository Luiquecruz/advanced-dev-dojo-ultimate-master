# Network Protocols: HTTP Versions, gRPC, WebSockets & SSE

The request-response cycle from the first lesson is only one way for programs to talk. A chat app, a stock ticker and a fleet of internal services each need something different: many small calls between services, a steady stream of updates to a browser, or messages flowing both ways at once. This lesson walks through the protocols behind those choices and the trade-off each one makes.

You need: Client-Server Architecture & HTTP Basics (TCP, HTTP requests and status codes) and Load Balancing Basics (what a load balancer does).

## HTTP/1.1, HTTP/2 and HTTP/3

**HTTP/1.1** sends text requests over a TCP connection. Connections are persistent by default (**keep-alive**), so a client reuses one connection for many requests instead of paying the TCP and TLS handshakes (the round trips that set up a connection) every time. But in practice a connection carries one request at a time: the next request waits until the current response has fully arrived. That is **head-of-line blocking**: one slow response holds up everything queued behind it. Pipelining, which lets a client send requests back to back, does not fix it: responses must still return in order, and browsers leave it off. Instead, browsers open several connections per host (around six), which costs memory and handshakes on both ends.

**HTTP/2** keeps the same methods, paths and status codes but changes how they travel:

- **Binary framing**: messages are split into frames that machines parse quickly and unambiguously.
- **Multiplexed streams**: many requests and responses are in flight at the same time over a single TCP connection, each one a numbered stream whose frames are interleaved.
- **Header compression** (HPACK): repeated headers such as cookies and user agents are sent once and then referenced, which matters when a page makes hundreds of small requests.

HTTP/2 removes head-of-line blocking at the HTTP level but not at the TCP level. TCP delivers bytes in order, so one lost packet stalls every stream on the connection until it is retransmitted.

**HTTP/3** fixes that by replacing TCP with **QUIC**, a transport built on **UDP**, the internet's other basic transport, which sends independent packets with no connection, ordering or retransmission. QUIC adds reliability itself, per stream, so a lost packet only delays the streams whose data it carried. It also merges the transport and TLS handshakes: one round trip for a new connection, zero for a resumed one (that early data can be replayed by an attacker, so it should only carry idempotent requests). And it identifies connections by an id instead of an IP address and port, so a phone switching from Wi-Fi to mobile data keeps its connection.

## gRPC and Protocol Buffers

**gRPC** is a framework for calls between services. You describe the service and its messages in a schema written in **Protocol Buffers**, a compact binary serialization format:

```proto
syntax = "proto3";

service Prices {
  rpc GetPrice (PriceRequest) returns (Price);
  rpc WatchPrices (WatchRequest) returns (stream Price);
}
message PriceRequest { string symbol = 1; }
message WatchRequest { repeated string symbols = 1; }
message Price { string symbol = 1; int64 cents = 2; }
```

A code generator turns the schema into typed client and server code in each language, so a call looks like a local function and a misspelled field is a compile error, not a production bug. Messages are smaller and faster to parse than JSON, and field numbers let old and new versions of a service keep talking. gRPC runs on HTTP/2 and offers four call types: unary (one request, one response), server streaming, client streaming and bidirectional streaming.

Browsers do not expose the HTTP/2 framing and trailers gRPC relies on, so a web page cannot call a gRPC service directly; it uses gRPC-Web, usually through a translating proxy, or the service also exposes a JSON API. gRPC fits best between your own back-end services.

## Pushing updates: polling, long polling, SSE and WebSockets

HTTP is client-initiated: the server cannot speak first. Four techniques get fresh data to a client:

| Technique | How it works | Cost |
| --- | --- | --- |
| **Polling** | the client asks every few seconds | most responses are empty; an update waits up to one interval |
| **Long polling** | the server holds the request open until data arrives or a timeout, then the client asks again | one request per update, plus reconnect overhead |
| **Server-Sent Events (SSE)** | one long-lived HTTP response with content type `text/event-stream`; the server writes events as they happen | server-to-client only, text only |
| **WebSockets** | an HTTP/1.1 request with `Upgrade: websocket` answered by `101 Switching Protocols`, then both sides send frames at any time | full duplex, but a protocol of its own |

**SSE** is plain HTTP, so load balancers, cookies and HTTP/2 multiplexing keep working; only a proxy that buffers responses has to be told to pass each event straight through. Over HTTP/1.1, though, every stream holds one of the six or so connections a browser opens per domain, shared by all its tabs, so serve SSE over HTTP/2. The browser's `EventSource` reconnects automatically and sends the id of the last event it received in a `Last-Event-ID` header, so the server can resume where the stream broke. An event is a few `field: value` lines followed by a blank line:

```text
id: 42
event: price
data: {"symbol":"ACME","cents":1999}

```

A `retry:` line sets the reconnection delay in milliseconds, and a line starting with `:` is a comment, which servers send periodically as a heartbeat so idle connections are not cut.

**WebSockets** suit traffic in both directions: chat, multiplayer games, collaborative editing. The connection is stateful, so the server that holds it must keep it open, and a deploy or failover drops every client attached to that server. Reconnection, missed messages and authentication are yours to design.

## Common mistakes

- **HTTP polling for high-frequency streams.** One million clients polling every second is one million requests per second, each paying for headers and a round trip whether or not anything changed, and an update still waits up to a second. Use SSE for server-to-client streams and WebSockets when both sides talk.
- **WebSockets for one-way updates.** You give up automatic reconnection, `Last-Event-ID` resumption and plain HTTP tooling for duplex traffic you never send.
- **Calling gRPC from the browser as if it were REST.** Browsers need gRPC-Web, usually behind a translating proxy; plan that layer or offer JSON at the edge.

## In practice

Pick by traffic shape. Request-response from browsers: HTTP with JSON, served over HTTP/2 or HTTP/3 by the load balancer or CDN. Service-to-service calls with strict contracts: gRPC. Server-to-client live updates (notifications, dashboards, progress): SSE. Two-way, low-latency interaction: WebSockets. Long-lived connections change capacity planning: you count open connections per server, not only requests per second.

## Check yourself

1. A page loads 150 small assets over HTTP/2 on a lossy mobile network and still stalls. What blocks it, and how does HTTP/3 help?
2. A dashboard shows order counts updated a few times per second. Why is SSE a better fit than polling or WebSockets?
3. What does `Last-Event-ID` let a server do after a dropped connection?
