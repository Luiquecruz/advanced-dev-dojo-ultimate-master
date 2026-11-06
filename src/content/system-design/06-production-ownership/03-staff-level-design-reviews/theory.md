# Staff-Level Design Reviews

The track ends where much senior design work happens: in a design review, where a proposal is questioned before anyone builds it. At staff level the design is rarely the hard part; owning the decision is, with its alternatives, risks, migration and long-term cost. This lesson turns the four-step framework into that practice, at work and in senior interview rounds.

You need: The Four-Step System Design Framework, Back-of-the-Envelope Estimation, Saga Pattern & Transactional Outbox (the dual-write problem), Observability, SLOs & Error Budgets and Multi-Region & Cell-Based Architecture.

## What changes at staff level

A senior engineer designs a component well. A staff engineer owns the decision around it:

- **Requirements**: which problem is worth solving, how success is measured (an SLO, a cost, a deadline), and what is explicitly out of scope.
- **Constraints**: team skills, budget, compliance, existing systems and the teams that depend on them.
- **Risks**: what can fail, how likely it is, how it would be detected and what limits the damage.
- **Long-term cost**: operations, on-call load, future migrations and the next team that inherits the system.

The output is a decision that others can follow and challenge, not a diagram.

## Design documents and decision records

A **design document** holds the whole proposal: context, goals and non-goals, requirements with numbers, the options considered, the chosen design, failure modes, the migration and rollout plan, cost and open questions. Share it while changing course is still cheap.

An **architecture decision record (ADR)** captures one significant decision in a page: the **context**, the **options considered**, the **decision**, its **consequences**, good and bad, and a **status** (proposed, accepted, superseded). Records are append-only: when a decision changes, a new record supersedes the old one, so the reasons stay readable. Record the decisions that shape the structure or a key quality attribute, or that are hard to reverse.

## Comparing alternatives with explicit criteria

Present at least two real options, often including "improve what exists", and compare them against criteria taken from the requirements and fixed in advance, so they are not tailored to a favorite. Say order events must reach an analytics store:

| Criterion | Nightly batch export | Change data capture stream |
| --- | --- | --- |
| Freshness | next morning | seconds |
| Operational load | one scheduled job | a connector, a stream and consumers to run |
| Cost | low | higher, always on |
| Reversibility | easy | harder once other teams consume the stream |

If the requirements say analytics may lag a day, the batch export wins, and the record names the stream as the next step if freshness ever matters.

## Reversible and irreversible decisions

Match the rigor to the cost of undoing a decision. **Two-way doors**, such as a cache time-to-live, a library behind an interface or a feature behind a flag (a runtime switch), deserve a quick decision, a measurement and a rollback if needed. **One-way doors**, such as a public API contract, a shard key, the primary database or deleting data, deserve prototypes, load tests, a written review and explicit sign-off. Good designs move decisions toward the reversible side: interfaces around vendors, expand-and-contract schema changes (below), and the old path kept alive until the new one is proven.

## Migrations that can stop at every step

- **Strangler fig**: route requests through a layer in front of the old system and move one capability at a time to the new one until nothing is left. The temporary routing is transitional architecture, a cost that the lower risk and earlier value outweigh.
- **Dual writes with backfill and verification**: copy every new write to the new store (from the old store's change stream or an outbox, because two writes in the request path can silently diverge after a crash), backfill history with an idempotent, checkpointed job that never overwrites newer writes, verify with counts, checksums and shadow reads that compare old and new answers, move reads gradually, and retire the old store only after a soak period.
- **Shadow traffic**: send a copy of real requests to the new path and discard its answers, comparing results and load without user impact; switch off side effects such as emails and charges first.
- **Canary and gradual rollout**: release to a canary (1% of users or one cell), compare its errors and latency with the rest, then widen to 10%, 50% and 100%, rolling back automatically when the canary is worse.
- **Expand and contract** (parallel change): expand by adding the new field or format next to the old one, deploying readers that understand both before any writer switches; migrate every client; contract by removing the old one once nothing uses it. Every step before the contract can be rolled back.

## Failure-mode analysis

For each component and dependency, ask "what happens when it is down, slow or wrong?" and write down the user impact, the alert that detects it, the mitigation (a timeout, a fallback, a circuit breaker, a cell boundary) and the recovery. If the feature flag service is down, for example, each server keeps the last flags it received instead of failing requests. Include dependencies you do not own, the control plane, the deploy pipeline and the data itself.

## Cost is a requirement

Estimate the monthly cost and the cost per unit, such as per 1,000 requests or per active user: compute, storage growth, traffic between zones and regions, licenses and the people on call. A design that meets its SLO at three times the budget is not finished.

## Product and infrastructure rounds

In an interview the four steps stay, but their center of gravity moves:

- **Product design** (a photo feed, a ride-hailing app): step 1 is about users, features and scale; the deep dive about the data model, the read path and caching.
- **Infrastructure design** (a rate limiter, a distributed queue, a key-value store): step 1 is about the clients and the guarantees (consistency, ordering, delivery, durability, latency, behavior when the system itself is down); the deep dive about partitioning, replication, failure handling and operations.

At staff level both rounds expect you to drive: state assumptions, compare two options with criteria, name the risks, and close with migration, observability and cost.

## Common mistakes

- **Presenting one design without alternatives and trade-offs.** Reviewers cannot tell whether it was chosen or merely the first idea, and the discussion turns into a defense of details. Compare at least two options against criteria written before the comparison, and say why the others lost.
- **A big-bang migration** with no verification step and no rollback plan.
- **The same rigor for every decision**: weeks of review for a reversible library choice, an afternoon for the shard key.
- **Cost and operations left for after launch**, when the design is most expensive to change.

## In practice

Write the design document before the code and an ADR when a decision is made. For every migration, list the steps with their verification and rollback; for every dependency, the answer to "what if it is down?". In reviews, ask what you would want to be asked: what else did you consider, what would change your mind, and how do we undo this? Every pattern in this track is an option to compare, never a default.

## Check yourself

1. List the steps between "the new database exists" and "the old database is deleted" in a data migration, and what each step verifies.
2. Which of these are one-way doors: a cache time-to-live, a public API field name, a table's shard key, a logging library behind an interface?
3. In an infrastructure round, what do you clarify in step 1 that a product round would not ask about?
