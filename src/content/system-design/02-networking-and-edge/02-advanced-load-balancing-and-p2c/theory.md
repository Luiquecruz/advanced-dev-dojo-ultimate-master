# Advanced Load Balancing: Layer 4, Layer 7 & Power of Two Choices

Load Balancing Basics introduced a balancer that rotates requests across healthy servers. Real traffic asks more of it: send `/api` to one fleet and `/images` to another, terminate TLS once, avoid the one server that is stuck on slow queries. This lesson separates the two kinds of balancer, layer 4 and layer 7, and compares the algorithms that choose a server, ending with the power of two random choices, a policy built into proxies such as Envoy and NGINX.

You need: Client-Server Architecture & HTTP Basics (TCP, HTTP, idempotent methods), Load Balancing Basics (round robin, health checks) and Network Protocols: HTTP Versions, gRPC, WebSockets & SSE (HTTP/2 multiplexing, long-lived connections).

## Layer 4 and layer 7

The names come from the layers of the OSI network model: layer 4 is transport (TCP, UDP), layer 7 is the application (HTTP).

A **layer 4 balancer** works on connections. It sees IP addresses and ports, picks a server when a TCP connection (or UDP flow) starts and forwards packets for that connection, without reading them. That makes it very fast and protocol-agnostic: it balances databases, game servers and encrypted traffic it cannot read. Its limit is that every request sent over a connection goes to the same server, and it has no idea what a request asks for.

A **layer 7 balancer** (a reverse proxy) terminates the client connection, reads each HTTP request and forwards it to the chosen server over a connection of its own, usually one from a pool it keeps open. Because it understands HTTP it can:

- **Route by content**: path (`/api/v2/*` to the new fleet), host name, header or cookie.
- **Terminate TLS** once at the edge, so servers do not each manage certificates and handshakes.
- **Balance per request**, not per connection, which matters with HTTP/2 and gRPC, where one connection carries thousands of requests.
- **Retry** a failed idempotent request on another server, rewrite headers and record per-route latency and error rates.

The price is work per request: parsing, TLS and buffering cost CPU and add a little latency. Large systems often stack both: a layer 4 tier spreads connections across a fleet of layer 7 proxies, which do the routing.

## Choosing a server

Once the pool is known, an algorithm picks one healthy server:

| Algorithm | Picks | Good for | Weak spot |
| --- | --- | --- | --- |
| Round robin | the next server in turn | identical servers, uniform requests | ignores load; a slow server keeps getting its share |
| Weighted round robin | in turn, proportionally to a weight | mixed machine sizes, gradual rollouts | weights are static |
| Least connections | the server with the fewest open connections | long-lived connections | with HTTP/2, one connection may hide thousands of requests |
| Least outstanding requests | the server with the fewest requests in flight | requests of uneven cost | needs per-request tracking, so layer 7 only |
| Power of two random choices | the less loaded of two random servers | many balancers, large pools | slightly less precise than a full scan |

Least connections counts open connections, which equals the requests in progress only while each connection carries one request at a time, as in HTTP/1.1. Over HTTP/2 and gRPC the two drift apart, and least outstanding requests counts the work that is really in flight.

"Least loaded" sounds ideal but has a trap. A balancer's view of load is always a little stale, and large systems run many balancer instances, each with its own view. When a new server joins with zero connections, every balancer sees it as the least loaded and they all send to it at once: **herding**. The idle server is flooded, its load jumps, and the herd moves to the next one.

## Power of two random choices

**Power of two random choices** (P2C) avoids the herd: pick two servers at random, then send the request to the less loaded of the two. Randomness spreads the decisions of independent balancers, so they rarely converge on one server, and the comparison steers traffic away from overloaded servers. A classic result in randomized load balancing shows that going from one random choice to two shrinks the worst imbalance dramatically, while a third choice adds little. It also needs only two load readings per request instead of a scan of the whole pool.

```text
in flight: a=3  b=0  c=7  d=2
sample two at random: c and d  ->  d has fewer  ->  send to d (now 3)
```

Drawing the two samples as distinct servers is worth it: with two independent draws from a pool of n servers, 1 request in n gets the same server twice and has nothing to compare, which is half of the requests in a pool of two. Envoy's least-request policy uses P2C over active requests when host weights are equal, and NGINX offers `random two least_conn`.

## Common mistakes

- **L4 balancing when path routing is needed.** A layer 4 balancer never reads the URL, so `/api` and `/images` cannot go to different pools. Teams end up exposing one port per service or routing inside the application. Put a layer 7 balancer where routing depends on paths, hosts or headers.
- **Matching the first prefix instead of the longest.** With `/api` listed before `/api/v2`, every v2 request goes to the old pool.
- **Least connections in front of HTTP/2 or gRPC.** A few long-lived connections each carry very different request volumes; balance outstanding requests instead.

## In practice

Use layer 4 when you need raw throughput or non-HTTP protocols, layer 7 when routing, TLS termination or per-request balancing matter, and often both stacked. Inside a pool, round robin is fine for uniform, short requests; reach for least outstanding requests or P2C when request costs vary or many balancer instances share the fleet. Whatever the algorithm, it only chooses among servers the health checks mark as healthy.

## Check yourself

1. A gRPC service gets one connection per client and one server sits at 90% CPU while others idle. Why, and what would you change?
2. Why does sending to the globally least loaded server go wrong when 20 balancer instances share a fleet?
3. A route table lists `/` → web, `/api` → api and `/api/v2` → api-v2. Which pool serves `/api/v2/orders`, and why?
