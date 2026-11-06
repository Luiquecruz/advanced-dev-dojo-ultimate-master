# Discord Architecture: ScyllaDB, Rust & Tail Latency

Discord is a chat platform where millions of people read and send messages in real time, and its engineering blog has documented several turning points: real-time gateways on the Erlang virtual machine, a message store on Cassandra that grew into constant firefighting, and the move to ScyllaDB with Rust services in front of it. The common thread is tail latency: the slowest requests, not the average ones, decided what users felt and what had to change.

You need: Network Protocols: HTTP Versions, gRPC, WebSockets & SSE, Storage Engines: B-Trees vs LSM Trees, Database Replication & Sharding, Consistent Hashing with Virtual Nodes, and Caching Patterns & Stampede Mitigation.

## Real-time gateways on the BEAM

Discord built its real-time layer in Elixir, a language that runs on the **BEAM**, the Erlang virtual machine. The BEAM runs huge numbers of **lightweight processes**: not operating system threads, but tiny units with their own small heap that the VM schedules across all cores. Processes share no memory; they talk by sending messages. Each process has its **own heap and its own garbage collector**, so collecting one process's garbage pauses only that process, never the whole VM. **Supervisors** watch groups of processes and restart a child that crashes, which is how Erlang systems stay up without defensive code everywhere.

Discord's posts describe the shape: each connected user holds a WebSocket and a session process; each server (a "guild") is a process on another node; a message published in a guild is fanned out to the session of every connected member. Because a single process handles its mailbox one message at a time, very large guilds needed the fan-out spread across nodes and workers so one process would not become the bottleneck.

## Messages on Cassandra

Messages lived in Cassandra, partitioned by **channel plus a time bucket** (a static time window) and sorted by time-ordered ids, so all messages of one channel and bucket are stored together on the same replicas. Cassandra is an LSM-tree database: writes go to a commit log and a MemTable, while reads may have to merge the MemTable with several SSTables, which makes reads the expensive side. Three problems compounded:

- **Hot partitions.** A small group of friends sends a few messages; a server with hundreds of thousands of people sends orders of magnitude more. A flood of reads on one channel and bucket loaded the nodes holding it, and because reads and writes used quorum consistency, every query touching those nodes slowed down too.
- **Compaction backlog.** Nodes fell behind on compacting SSTables, so reads touched more files and the compaction itself added latency. The team regularly took nodes out of rotation just to let them compact.
- **Garbage-collection pauses.** Cassandra runs on the Java virtual machine, and the team spent a large amount of time tuning the garbage collector and heap because pauses caused significant latency spikes.

## ScyllaDB: the same model without a JVM

ScyllaDB implements the Cassandra data model and query language in C++. Its **shard-per-core** design gives each CPU core its own slice of data with its own cache, MemTables and SSTables, so cores do not contend for locks, and with no JVM there are no garbage-collection pauses. Discord moved its other Cassandra clusters first, gaining experience in production, before migrating the message store.

A new database does not remove hot partitions, so Discord also protected the database from upstream traffic.

## Rust data services: coalescing and routing

Between the API and the database, Discord wrote **data services** in Rust: roughly one gRPC endpoint per query, with no business logic. Their main job is **request coalescing**: when many users ask for the same row at the same time, the first request starts a worker task that queries the database and every later request subscribes to that task's result. When a big announcement notifies everyone in a large server, identical reads that arrive together share one query; Discord reports that this significantly reduced traffic spikes against the database. Upstream, requests are routed with **consistent hashing** on a routing key (the channel id for messages), so every request for one channel reaches the same service instance, where coalescing can work.

For the migration itself, new messages were written to both databases (dual writes) while a migrator copied the history: the team extended the same Rust library to read token ranges from Cassandra, checkpoint progress locally and write them into ScyllaDB. Before ScyllaDB became the primary, a small percentage of reads went to both databases and the results were compared. Discord's post reports the p99 for fetching historical messages dropping from a range of 40–125 ms on Cassandra to about 15 ms on ScyllaDB.

## p99, not the average

The **p99** is the latency that 99% of requests beat. A service averaging 5 ms can still have a p99 of 200 ms if two requests in every hundred wait behind a pause. Tails get worse with fan-out: a page that needs ten backend calls is as slow as the slowest of the ten, and with three replicas a quorum read waits for the second-fastest one. A stop-the-world collection, a compaction burst or a hot partition stalls every request on that node at once, which is exactly the tail. Another Discord post describes the same lesson in a different service: latency spikes every few minutes traced to the garbage collector scanning a large in-memory cache, removed by rewriting the service in Rust, which frees memory as soon as it is no longer used.

## Common mistakes

- **Ignoring garbage-collection pauses in p99 latency.** Averages hide pauses that stall a whole node; measure p99 and p999, and correlate spikes with GC logs before tuning anything else.
- **Expecting a faster database to fix hot partitions.** A key that receives most of the traffic overloads any engine. Coalesce identical requests and route them by key before they reach the database.
- **Partitioning chat history by channel alone.** A busy channel grows one partition without bound; a time bucket in the partition key caps its size.

## In practice

Report latency as percentiles per endpoint, and for each spike ask which node-wide event caused it: GC, compaction, a hot key. Put a thin data service in front of a shared database when many callers ask for the same rows, route by the entity key with consistent hashing, and coalesce in-flight reads. Migrate with dual writes, checkpointed backfills and shadow reads compared against the old store.

## Check yourself

1. Why does a per-process garbage collector on the BEAM hurt tail latency less than a JVM-wide pause?
2. A mass mention sends thousands of concurrent reads for the same messages. Which two mechanisms, in and in front of Discord's data services, keep most of them from reaching the database?
3. A service has a 4 ms average and a 180 ms p99. What would you look for first?
