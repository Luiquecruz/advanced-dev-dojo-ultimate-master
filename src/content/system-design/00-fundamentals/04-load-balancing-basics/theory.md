# Load Balancing Basics

Stateless servers can be copied, but clients still need one address to call. A load balancer is that address: it receives every request and hands it to one of the copies behind it, stops sending traffic to copies that are failing, and lets you add or remove copies without clients noticing. This lesson covers how it chooses, how it knows a server is sick, and why the balancer itself must not become the weak point.

You need: Client-Server Architecture & HTTP Basics, Statelessness & Sessions.

## What a load balancer does

Clients resolve one name with DNS and connect to the **load balancer**. It keeps a **pool** of backend servers, picks one for each request or connection, forwards the request and relays the answer. NGINX, HAProxy, Envoy and the managed balancers of every cloud provider all do this.

Two benefits follow. **Capacity**: three copies handle roughly three times the traffic of one. **Availability**: when one copy crashes, the others keep answering, as long as the balancer stops sending it traffic.

## Choosing a server: round robin

**Round robin** is the simplest algorithm: walk the pool in order and wrap around. With servers `a`, `b`, `c`, requests go `a, b, c, a, b, c`. It needs no measurements and spreads requests evenly when the servers are alike and the requests cost about the same. Variants handle the cases where they are not: **weighted round robin** sends more requests to bigger machines, and **least connections** picks the server with the fewest open connections (when each connection carries one request at a time, as in HTTP/1.1, that is the requests in progress), which suits requests of very different durations.

## Health checks

With three servers, a balancer that keeps sending requests to the one that crashed turns that failure into errors on a third of all requests. **Health checks** prevent that:

- **Active checks**: the balancer calls an endpoint such as `GET /health` every few seconds. After a few failures in a row the server is marked **down** and leaves the rotation; after a few successes it is marked **up** again.
- **Passive checks**: the balancer watches real traffic and takes a server out after repeated errors or timeouts.

A health endpoint should check what the server needs to answer requests (is the process responsive, can it reach its database?) and leave out side services such as email: when every server's check depends on the same slow side service, every server is marked down at once and the pool is empty.

When a server is marked down, the rotation must skip it and continue with the next healthy one. It must not send requests to it, and it must not skip a healthy server either, or the load becomes uneven.

## The balancer as a single point of failure

A **single point of failure** is a component whose failure stops the whole system. Putting one balancer in front of ten servers removes the servers as single points of failure and creates a new one: the balancer.

**High availability** means removing those points with redundancy. The usual setups are a pair of balancers where a standby takes over the shared address when the active one stops answering (active-passive), several active balancers behind DNS names that return more than one address, or a managed cloud balancer that is already redundant across several data centers. The rule is the same at every layer: two of everything that every request passes through.

## Sessions behind a balancer

Statelessness & Sessions showed that sessions kept in one server's memory break once there are two servers. A balancer makes this visible on the first day, because consecutive requests from one user land on different servers.

Two fixes exist. **Sticky sessions** (session affinity) make the balancer send a user to the same server every time, usually with a cookie it sets. That hides the problem without solving it: a server that dies or is redeployed still logs out its users, and a few heavy users can overload one server while others sit idle. A **shared session store** keeps the servers stateless, so the balancer can pick any healthy server for every request. Prefer the shared store; treat stickiness as an optimization (a server keeping a user's data warm in memory), never as the only copy of the state.

## Common mistakes

- **A load balancer without a shared session store.** Users are logged out whenever a request reaches another server; sticky sessions only postpone it until a server restarts.
- **No health checks**, so a crashed server keeps receiving its share of requests and returns errors.
- **A single balancer** in front of redundant servers: the system is only as available as its one balancer.
- **A health check that tests everything**, so one slow dependency marks all servers down together.

## In practice

Place every stateless service behind a balancer with health checks from the start, even with two servers. Pick round robin until measurements show uneven work, move sessions to a shared store before adding the second server, and check that the balancer layer itself has no single instance. Know what your balancer does when every check fails: some managed balancers fail open and keep sending traffic to all servers, on the bet that a broken check is likelier than a broken fleet, so a bad health check can hide a real outage or cause one.

## Check yourself

1. Servers `a`, `b`, `c`, `d` rotate in order. After `a` and `b` are picked, `a` and `c` are marked down. Which servers do the next three requests reach?
2. Why do sticky sessions not make in-memory sessions safe?
3. Ten servers sit behind one load balancer. What is the single point of failure, and how do you remove it?
