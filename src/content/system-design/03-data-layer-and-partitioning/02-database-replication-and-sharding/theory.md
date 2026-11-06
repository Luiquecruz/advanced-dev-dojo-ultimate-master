# Database Replication & Sharding

One database server eventually runs out of something: read capacity, write capacity, disk or the patience of users waiting during a failure. There are two ways out. **Replication** keeps copies of the same data on several machines, for more reads and for survival when one machine dies. **Sharding** splits the data so that each machine holds only part of it, for more writes and more storage. They solve different problems, they are usually combined, and both come with costs that are easy to underestimate.

You need: Database Basics: SQL vs NoSQL (access patterns), Scaling from Zero to One Million Users (primary and read replicas) and Storage Engines: B-Trees vs LSM Trees (the write-ahead log).

## Single-leader replication

The most common setup has one **primary** that accepts every write and several **replicas** that copy it. The same roles are also called leader and followers (master and slave in older documentation), which is where the name single-leader replication comes from. Replication ships the primary's log of changes: PostgreSQL streams its write-ahead log, MySQL sends its binary log. Each replica applies the changes in the same order and serves reads.

Replicas give you more read capacity, a copy in another zone (a separate data center in the same region) or region, and a machine ready to take over when the primary fails. They do not add write capacity: every replica still applies every write.

### Synchronous or asynchronous

- **Synchronous**: the primary confirms a commit only after a replica has stored it. A confirmed write survives the loss of the primary, but every commit waits for a network round trip, and a slow or dead replica stalls writes.
- **Asynchronous**: the primary confirms as soon as its own log is written and replicas catch up later. Commits are fast, but writes confirmed in the last moments before a crash may exist only on the dead primary.

A common middle ground is one synchronous replica and the rest asynchronous: one guaranteed copy without waiting for every replica.

### Replication lag and read-your-writes

An asynchronous replica is always a little behind the primary, usually milliseconds, sometimes seconds or minutes under heavy load. That **replication lag** produces a classic bug: a user updates their profile, the next page reads from a replica that has not applied the update, and the old name comes back. The guarantee the user expects is **read-your-writes**. Common ways to provide it:

- read a user's own data from the primary for a short window after they write;
- remember the log position of the user's last write and read only from a replica that has applied it;
- read data a user can edit from the primary and everything else from replicas.

### Failover and split-brain

When the primary dies, **failover** promotes a replica: detect the failure (usually a timeout), choose the most up-to-date replica, promote it and point clients at it. With asynchronous replication, the promoted replica may lack the last confirmed writes, which are lost. And a timeout cannot tell a dead primary from a slow network, so a primary that was only unreachable may come back and keep accepting writes while the new primary does too. Two primaries accepting writes is **split-brain**, and the two histories cannot be merged safely. Production setups prevent it with fencing (cutting the old primary off before promoting the new one) and with a majority vote on who is primary; the consensus lesson later in this track covers how that vote works.

### Multi-leader and leaderless

- **Multi-leader** replication lets several nodes, typically one per region, accept writes and exchange them. Writes stay local, but two leaders can change the same row at once, and resolving conflicts (often "last write wins") can silently drop one of them.
- **Leaderless** replication, used by Cassandra and other Dynamo-style stores (modeled on Amazon's Dynamo design), sends each write to several replicas and reads from several. With N copies, a write acknowledged by W replicas and a read from R replicas overlap on at least one up-to-date copy when W + R > N.

## Sharding

**Sharding** (also called partitioning) splits a dataset across several databases, the **shards**. Each shard owns a subset of the rows and is usually its own primary with replicas. The **shard key** decides which shard owns a row, and it is the most consequential choice of the design, because changing it later means moving most of the data.

- **Range sharding** assigns contiguous key ranges to shards (`A`–`F` on shard 1, `G`–`M` on shard 2). Range scans touch only the shards covering the range, but sequential keys such as timestamps or auto-increment ids send every new write to the last shard.
- **Hash sharding** applies a hash function to the key and maps the hash to a shard. Writes spread evenly, but a range query must ask every shard.

A good shard key has many distinct values, spreads load evenly and matches the main access pattern: sharding orders by `customer_id` keeps a customer's orders together, so the common query touches one shard.

### What gets harder

- **Hotspots**: even with a perfect hash, one hot key overloads the shard that owns it. Cache a read-hot key, such as a celebrity profile, or copy it to several shards; split a write-hot key, such as a viral post's like counter, into sub-keys (`post#0` to `post#9`) that spread the writes, at the price of reading all of them.
- **Cross-shard queries**: a query without the shard key becomes scatter-gather, sent to every shard and merged, so its latency is the slowest shard's latency.
- **Joins and transactions** across shards are no longer done by one database. Denormalize, co-locate related rows under the same shard key, or join in the application; an atomic change across shards needs a distributed protocol, covered later in this track.
- **Resharding**: adding shards means moving data while the system serves traffic. With `hash(key) % N`, changing N moves almost every key; the next lesson shows how consistent hashing limits the move to a small fraction.

## Common mistakes

- **Sharding before it is needed.** Sharding is a one-way door (a decision that is very hard to undo) that complicates every query, transaction and migration. Before it, exhaust the cheaper steps: add the missing indexes, fix slow queries, cache hot reads, send reads to replicas, buy a bigger machine and archive cold data. A single well-tuned primary handles far more than most products need.
- **Reading from a replica right after a write** and showing users stale data. Route their own reads to the primary or to a replica that has caught up.
- **Automatic failover without fencing**, which invites split-brain.
- **A shard key with few values or a monotonic one**, such as a country code, or a timestamp under range sharding. Both concentrate load on one shard.

## In practice

Add replicas for read scale and availability, and decide per query whether it tolerates stale data. Measure replication lag and alert on it. Shard only when write throughput or data size has outgrown the largest machine you can reasonably run, and choose the shard key from the queries you run most, written down before the first row moves.

## Check yourself

1. Your product needs zero loss of confirmed payments when the primary dies. Which replication mode does that require, and what does it cost on every commit?
2. A user changes their avatar and still sees the old one on the next page. What happened, and name two ways to fix it.
3. An events table is range-sharded by creation time. Why is one shard overloaded while the others are idle?
