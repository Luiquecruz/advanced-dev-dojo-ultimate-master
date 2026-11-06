# Scaling from Zero to One Million Users

No large system starts large. It starts as one server and grows one bottleneck at a time: each step below removes the limit that the previous design hit, and each adds cost and moving parts. This lesson walks that path so you can place any design on it, and so you know which step a given number of users actually needs.

You need: The Four-Step System Design Framework, Back-of-the-Envelope Estimation, Statelessness & Sessions, Database Basics: SQL vs NoSQL, Load Balancing Basics and Caching Fundamentals.

## One server

The web application, the database and static files all run on one machine. Users resolve the domain with DNS and send HTTP requests straight to it. It is cheap and simple to deploy, and it is the right design for a prototype or a few thousand users. Its limits: one machine's CPU, memory and disk, and a single point of failure.

## Separate the database

The first split moves the database to its own server. The web tier and the data tier now scale independently: web servers need CPU, databases need memory and fast disks. It is also the first step that makes the web servers replaceable.

## Vertical vs horizontal scaling

**Vertical scaling** (scale up) means a bigger machine: more CPU, more memory. It needs no code changes, which makes it the right first answer, but it has a hard ceiling, gets expensive near the top, and the machine is still a single point of failure. **Horizontal scaling** (scale out) means more machines of the same size. It has no hard ceiling and survives the loss of one machine, but the application must be designed for it.

## Load balancer and a stateless web tier

Horizontal scaling of the web tier needs a **load balancer** in front of several web servers, routing around unhealthy ones with health checks. It only works if the web servers are **stateless**: sessions live in a shared store (or in a signed token), not in one server's memory, so any server can answer any request. Now a web server can fail or be added without users noticing.

## Database replication

The database is the next single point of failure and, for read-heavy systems, the next bottleneck. **Replication** keeps copies of the data on several servers: one **primary** accepts writes and streams them to **read replicas**, which serve reads. Reads scale with the number of replicas, and if the primary fails a replica can be promoted. The cost is **replication lag**: a replica may return data a moment old. A later lesson covers replication in depth.

## Cache tier

Many reads ask for the same data. A **cache** such as Redis, kept in memory in front of the database, typically answers repeated reads in less than a millisecond and takes load off the database. The database stays the source of truth; cached entries expire with a TTL or are invalidated on writes.

## CDN for static assets

Images, scripts, stylesheets and videos do not need the application at all. A **content delivery network** (CDN) is a network of cache servers spread around the world: users download static files from a nearby edge server, and only a cache miss reaches your own servers (the origin). Latency for distant users drops and so does the bandwidth on your servers.

## Multiple data centers

To survive the loss of a whole site and to serve users on several continents, the system runs in more than one data center. **Geo DNS** answers each user with the address of the nearest data center, and traffic is routed to a healthy one when a site fails. The hard part is data: each data center needs it, so it is replicated between sites. A failover then loses the writes that had not been copied yet, unless every write waits for the other site before it is confirmed, which adds a cross-site round trip to each write.

## Message queue for slow work

Some work does not need to finish before the response: resizing a photo, sending an email, updating a recommendation. A **message queue** is a durable buffer: the web server puts a message describing the job on the queue and answers immediately, and separate workers take messages off the queue and do the work. Producers and workers scale independently, and a burst of jobs waits in the queue instead of overloading the web tier. A later lesson covers delivery guarantees and failure handling.

## Logging, metrics and automation

With dozens of servers you can no longer log in to one machine to see what happened. Centralized **logs**, **metrics** (request rate, error rate, queue depth and latency percentiles: the p99 is the time that 99% of requests stay under) and alerts tell you where the next bottleneck is before users do. Automated builds, tests and deployments keep many servers consistent.

## Sharding as the last resort

When writes or data volume outgrow one primary database, the data is **sharded**: split across several databases by a key (for example the user id), each holding a subset. It scales writes almost without limit, but queries across shards, rebalancing and hot keys (one key, such as a celebrity's account, drawing far more traffic than its shard can serve) make it the most expensive step on the path. Exhaust vertical scaling, replicas and caching first. Later lessons cover sharding and how to assign keys to servers.

## Common mistakes

- **Over-engineering at low scale.** Adding sharding, several data centers and a message bus for a product with a few thousand users multiplies cost and failure points with no benefit. Estimate first; add each step when a number says the previous design is running out.
- **Scaling out a stateful web tier.** Several servers behind a load balancer break logins when sessions live in local memory.
- **Treating the cache as the source of truth.** A cache can lose entries at any time; the database must hold every write.
- **Ignoring replication lag.** Reading from a replica right after writing to the primary may return the old value.

## In practice

Map every design to this path: which step is it on, which bottleneck forced that step, and what is the next limit? A design that skips steps should justify it with an estimate, not with the size of famous companies.

## Check yourself

1. Why must the web tier be stateless before you add a load balancer and more web servers?
2. A read-heavy app overloads its single database. Which two steps would you try before sharding, and why?
3. What does geo DNS add, and what new problem appears with a second data center?
