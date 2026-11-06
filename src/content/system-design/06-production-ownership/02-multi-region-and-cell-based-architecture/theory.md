# Multi-Region & Cell-Based Architecture

A region is one failure domain: a natural disaster, a network partition or a bad change to a shared regional service can take everything in it down at once. More regions buy latency, availability and data residency, at the price of money, complexity and a decision about two regions changing the same data. This lesson covers active-passive and active-active designs, write conflicts, failover drills, and cells with shuffle sharding and static stability, which shrink the blast radius of self-inflicted failures.

You need: Database Replication & Sharding (replication lag, failover, multi-leader writes), CAP & PACELC Theorems (conflicts during partitions), Consensus & Leader Election (majorities), Resilience: Circuit Breakers, Retries & Bulkheads (bulkheads) and Observability, SLOs & Error Budgets.

## Why more than one region

- **Latency**: users far from the only region pay a long round trip on every request; a nearby region removes it.
- **Availability**: several zones in one region survive the loss of a data center; only another region survives the loss of the whole region, or of a regional dependency.
- **Data residency**: rules may require that some customers' data is stored and processed in their country or region.

The costs are just as concrete: duplicated capacity, paid traffic between regions, replication to operate, every deploy multiplied by the number of regions, and data that is never perfectly in sync. Justify a second region with an SLO, a latency target or a legal requirement.

## Recovery objectives and strategies

- **RPO** (recovery point objective): the maximum acceptable data loss, measured as time since the last recovery point. With asynchronous replication, the data you lose is what the replica had not received yet.
- **RTO** (recovery time objective): the maximum acceptable time from the interruption to the restored service.

| Strategy | Second region holds | RPO / RTO | Cost |
| --- | --- | --- | --- |
| backup and restore | backups | hours | lowest |
| pilot light | live replicated data, servers switched off | tens of minutes | low |
| warm standby | a scaled-down copy that is always running | minutes | higher |
| multi-site active/active | full copies, all serving users | near zero | highest |

The first three are **active-passive**: one region serves traffic and the other is promoted during failover. In **active-active** every region serves users, which leaves the hard question of who writes what. Replication is not a backup either: it copies corruption and accidental deletes within seconds, so point-in-time backups stay in every plan.

## Writes across regions

Cross-region replication lags by at least the network delay between the regions, so two regions can update the same record before either sees the other's change. Choose a strategy per kind of data:

- **A home region per record**: each customer or partition has a leader region that takes all its writes; other regions serve reads and forward writes. There are no conflicts, and moving a home is a planned, fenced step.
- **A single write region**: every write goes to one region, reads are served locally, and failover promotes another region.
- **Last-writer-wins**: every region accepts writes and the latest timestamp survives. It is simple, but it silently drops the other write, and skewed clocks decide which one is "latest".
- **CRDTs** (conflict-free replicated data types): types such as counters and sets whose concurrent updates merge in any order into the same state on every replica; a counter keeps every region's increments. Only data that fits those types benefits.
- **Consensus across regions**: each write waits for a majority of regions, which means a cross-region round trip on every write (the EC side of PACELC).

A shopping cart can merge, a like counter can be a CRDT, an account balance needs a single writer.

## Failover drills

A failover plan that has never run is a guess. Drill it regularly with real traffic: measure the RTO and the data lost against the RPO, and confirm the surviving region can absorb all the traffic. Fence the old primary before promoting a new one, so a region that comes back does not keep accepting writes, and keep DNS time-to-live values short enough for the RTO.

## Cell-based architecture

Many outages are self-inflicted: a bad deploy, a configuration push, a poison request that crashes every server it reaches, one tenant's traffic spike. Extra regions contain them poorly: every region runs the same code and configuration and receives the same requests.

A **cell** is a complete, independent copy of the workload, with its own compute, storage and queues, that serves a subset of customers and shares no state with other cells: a bulkhead around the whole stack. A **cell router**, kept as thin as possible, maps a partition key such as the customer id to a cell and does nothing else; a **control plane** creates cells and moves customers between them. With 10 cells, a failure inside one cell leaves 90% of requests unaffected. Changes roll out cell by cell, so a bad deploy is caught in one cell. Cells have a maximum size that is load tested; growth adds cells instead of enlarging them. Azure documents the same idea as the Deployment Stamps pattern.

## Shuffle sharding

Split 8 workers into 4 shards of 2, and a poison customer takes down its shard: a quarter of all customers. With **shuffle sharding**, each customer gets its own combination of 2 of the 8 workers. There are 28 combinations, so two customers rarely share both workers; when clients retry on the other worker of their pair, the poison customer fully affects only the customers with exactly its pair, about 1 in 28. More workers or larger shards make full overlaps exponentially rarer. Use it inside a cell, never across cells.

## Static stability

A **control plane** creates and changes resources; the **data plane** serves requests with them. Control planes are more complex and fail more often. A **statically stable** system keeps working while a dependency is impaired, without having to change anything: capacity is pre-provisioned (three zones, each sized so that any two carry the full load), the data plane keeps the last known configuration, and recovery needs no control plane action, such as launching new servers while every other customer is trying to do the same.

## Common mistakes

- **Active-active regions without a data conflict strategy.** Both regions accept writes to the same record, replication applies them in different orders, and last-writer-wins silently drops one: stock oversold, a profile edit lost. Choose per kind of data: a home region per record, a single write region, CRDTs or consensus.
- **A failover runbook that has never run**, found to be wrong during the real outage.
- **State shared between cells**, such as one database behind all of them, which turns a cell failure back into a global one.
- **Recovery that depends on the control plane**, such as scaling up the surviving region during a regional outage.

## In practice

Write the RPO and RTO per kind of data, pick the cheapest strategy that meets them, and drill the failover until its timings are known. Partition customers into cells behind a thin router, deploy to one cell first, and track the error budget per cell, so an alert names the cell that is burning.

## Check yourself

1. The business accepts losing 15 minutes of orders and 4 hours of downtime, on a tight budget. Which strategy fits, and why not active-active?
2. With last-writer-wins, a user edits the same profile in two regions within a second. What can be lost, and how does a home region per user prevent it?
3. Why does a cell-based architecture contain a bad deploy better than a second region does?
