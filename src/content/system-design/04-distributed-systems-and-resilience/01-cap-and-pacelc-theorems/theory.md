# CAP & PACELC Theorems

As soon as data lives on more than one machine, the network between those machines can fail, and every replicated database has to decide what to do when it does. The CAP theorem names that decision and PACELC extends it to the normal case, when nothing is broken but every answer still has a price in latency. This lesson turns both into questions you can ask of any database you are about to rely on.

You need: Database Replication & Sharding (primaries and replicas, replication lag, failover and leaderless quorums).

## Partitions are not optional

A **network partition** is any situation where some nodes cannot reach others: a broken switch, a misconfigured firewall, a congested link between two data centers, or a node paused long enough by garbage collection that its peers give up on it. From the inside, a partitioned node and a crashed node look the same: messages stop arriving and you cannot tell whether the other side is dead or just unreachable.

In a system spread over a network, partitions happen; you only choose how the system behaves while one lasts. That is why "pick two of three" is a misleading summary of CAP. A single-node database is trivially consistent and available, but it is not distributed. The moment you replicate, partition tolerance is a fact, not a feature you choose.

## CAP: consistency or availability during a partition

The CAP theorem (conjectured by Eric Brewer, proved by Seth Gilbert and Nancy Lynch) uses precise definitions:

- **Consistency** means **linearizability**: every operation appears to take effect at a single instant between its start and its end, so once a write is acknowledged, every later read, on any node, returns it or something newer. It is not the "C" of ACID, which is about constraints inside one database.
- **Availability** means every request that reaches a node that has not crashed gets a non-error response, without waiting for the partition to heal.

During a partition, a node cut off from its peers cannot know about writes made on the other side. It can either refuse to answer (keeping consistency) or answer with what it has (keeping availability). It cannot do both.

| Choice | Behavior during a partition | Example configuration |
| --- | --- | --- |
| **CP** | the side without a majority of replicas rejects writes, and often reads, until the partition heals | a store that commits a write only once a majority of replicas acknowledge it, such as etcd or ZooKeeper (next lesson) |
| **AP** | every reachable replica keeps accepting reads and writes; the sides diverge and are reconciled later | a Dynamo-style store written and read at consistency level `ONE` |

A CP store turns a partition into errors for some clients. An AP store turns it into conflicts: two replicas accept different writes to the same key, and when they reconnect the system must merge them, either with a rule such as last-write-wins by timestamp, which silently drops one of the writes, or by keeping both versions for the application to resolve.

## PACELC: the trade-off that never goes away

Partitions are rare. Daniel Abadi pointed out that the more frequent trade-off happens when the network is healthy. **PACELC** reads: if there is a **P**artition, choose **A**vailability or **C**onsistency; **E**lse, choose **L**atency or **C**onsistency.

A strongly consistent read or write has to coordinate with other replicas before it answers (a leader lease can skip that round trip for reads, at the price of assuming bounded clock drift), and that round trip, sometimes across regions, is latency the user feels on every request. A system that answers from the nearest replica without coordination is fast and may return stale data, exactly the replication lag you saw with asynchronous replicas.

- **PA/EL**: Dynamo-style stores at their default settings favor availability during a partition and low latency otherwise.
- **PC/EC**: configurations that keep every read and write strongly consistent, such as Google Spanner's strong reads and read-write transactions (ordered with globally synchronized clocks), pay coordination latency all the time and refuse work on the minority side of a partition.

Many systems let you pick per request. DynamoDB reads are eventually consistent by default; a strongly consistent read returns the most up-to-date data and uses more read capacity. Label a configuration, not a product.

## Tunable consistency with quorums

Dynamo-style stores keep each key on `N` replicas and let the client choose how many must answer: `W` replicas must acknowledge a write, `R` replicas must answer a read. When **R + W > N**, every read set overlaps every write set, so each read contacts at least one replica that holds the latest acknowledged write.

With `N = 3`, `W = 2` and `R = 2` (a majority each way) you get overlapping quorums and tolerate one slow or unreachable replica. With `W = 1` and `R = 1` writes and reads are fast and keep working while any one replica of the key is reachable, but a read can miss a recent write. Overlap is the building block of strong reads, not a full guarantee: concurrent writes and clock-based conflict resolution can still surprise you, which is what tools like Jepsen test.

## Common mistakes

- **Claiming CA during a partition.** A replicated system cannot be both linearizable and available while nodes cannot talk. If a vendor or a design says "CA", ask what happens to a write on the isolated side: either it is rejected or it may be lost later.
- **Reading CAP's "C" as ACID consistency.** CAP talks about linearizability across replicas, not about foreign keys or constraints.
- **Labeling a product instead of a configuration.** The same database can behave as CP or AP depending on its consistency level per request.
- **Forgetting the else branch.** Most of the time there is no partition, and the real cost of strong consistency is latency.

## In practice

When you pick or configure a store, ask two questions: what does a client on the minority side of a partition see (errors or possibly stale data), and how much latency does a strongly consistent request add when the network is healthy? Use strong consistency where a stale read is a real bug (balances, inventory you sell, unique usernames) and eventual consistency where a slightly old answer is fine (like counts, feeds, recommendations).

## Check yourself

1. A three-replica store loses the link between one replica and the other two. What does a CP configuration do with a write sent to the isolated replica, and what does an AP configuration do?
2. Why does PACELC matter even in a system that never sees a partition?
3. With `N = 5`, which `R` and `W` values give overlapping quorums with the fewest replicas per write?
