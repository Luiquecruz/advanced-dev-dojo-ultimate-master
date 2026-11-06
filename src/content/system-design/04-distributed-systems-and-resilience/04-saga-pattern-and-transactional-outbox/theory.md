# Saga Pattern & Transactional Outbox

Placing an order in a shop built from microservices touches three databases: the order service records the order, the payment service charges the card and the inventory service reserves the items. Inside one database a transaction makes such a change all-or-nothing. Across services there is no shared transaction, and this lesson shows the tools that replace it: sagas with compensating actions, the transactional outbox, change data capture and idempotency keys.

You need: Client-Server Architecture & HTTP Basics (idempotent methods), CAP & PACELC Theorems, and Message Queues & Event Streams (at-least-once delivery and idempotent consumers).

## Why one transaction cannot span services

An ACID transaction works because one database engine holds the locks and the write-ahead log for every row it touches. When each service owns its own database, which is the point of splitting them, no single engine sees all the rows. The order service cannot lock a row in the payment database, and the payment database cannot roll back because inventory failed.

## Two-phase commit and its cost

**Two-phase commit (2PC)** is the classic protocol for an atomic commit across several databases. A **coordinator** asks every participant to **prepare**: each one writes the change durably, keeps its locks and votes yes or no. If every vote is yes, the coordinator sends **commit**; otherwise it sends **abort**.

The protocol is correct, but it is expensive in exactly the places distributed systems hurt:

- **Blocking.** A participant that voted yes cannot decide on its own. If the coordinator crashes before sending the decision, the participant stays *in doubt*, holding its locks, until the coordinator comes back.
- **Locks held across the network.** Rows stay locked across several round trips (the work, prepare and commit), so contention grows with latency.
- **Availability is the product of all participants.** Every service must be up to commit anything, so one slow or failed service stops every transaction that includes it.
- **Support.** Many NoSQL databases, message brokers and third-party APIs (a card processor) cannot take part in 2PC at all.

2PC still has a place inside one system, between partitions of a single distributed database that controls every participant. Between independently deployed services it couples their availability and is rarely used.

## Sagas: local transactions with compensations

A **saga** splits the business transaction into a sequence of **local transactions**, one per service, each committed on its own. Every step that can be undone has a **compensating action**. When a step fails, the saga runs the compensations of the steps that already completed, **in reverse order**:

```text
1. create order (PENDING)     compensate: cancel order
2. charge card                compensate: refund payment
3. reserve items  -> fails    (nothing to compensate: its own transaction rolled back)
=> run: refund payment, then cancel order
```

Compensation is **semantic**, not a rollback. The charge happened and other systems may have seen it, so the compensation is a refund, a new fact that cancels the effect. A saga also gives up isolation: other requests can see the order as `PENDING` while the saga runs. Designs handle that with explicit states (a pending order cannot ship yet) and by putting steps that cannot be undone, such as shipping the parcel, last.

A compensation can fail too, so it must be safe to retry. A saga that cannot finish its compensations reports which ones failed, so an operator or a retry job can complete them.

### Orchestration and choreography

- **Orchestration**: one **orchestrator** (often a small state machine in the order service) calls each step and decides what runs next, including the compensations. The flow is visible in one place and easy to test and monitor.
- **Choreography**: there is no central controller. Each service reacts to events (`OrderCreated` → payment charges → `PaymentCharged` → inventory reserves) and publishes its own. It avoids a central component, but the flow is spread across services and hard to follow as steps grow.

Orchestration is the usual choice once a saga has more than two or three steps.

## The dual-write problem and the transactional outbox

A step usually changes its database **and** tells others by publishing an event. Written naively, that is two writes to two systems:

```text
await db.insert('orders', order)            // 1. commit to the database
await broker.publish('OrderCreated', order) // 2. a crash before this line loses the event
```

If the process crashes between the two lines, the order exists and nobody hears about it. Swap the order and a crash leaves an event for an order that does not exist. This is the **dual-write problem**.

The **transactional outbox** removes the second write from the request path. The service inserts the event into an `outbox` table **in the same local transaction** as the business change, so both are committed or neither is. A separate **relay** reads new outbox rows, publishes them to the broker and marks them as sent. A relay that crashes after publishing but before marking will publish the row again, so delivery is at-least-once and consumers must be idempotent.

### Change data capture

The relay can poll the outbox table, or it can use **change data capture (CDC)**: reading the change log the database already writes (the binlog in MySQL, the write-ahead log through logical decoding in PostgreSQL) and turning every committed change into an event. **Debezium** is an open-source CDC platform that does this and usually publishes the changes to Kafka; it also has a router that turns outbox rows into events on the right topic. Because the connector emits only committed transactions, in commit order, CDC never publishes a change that was rolled back, and it adds no polling queries.

## Idempotency keys

Retries appear at every layer: a client retries after a timeout, the relay republishes, the queue redelivers. Two techniques make them harmless:

- **Idempotency key on requests.** The client generates a unique key per operation and sends it in a header such as `Idempotency-Key`. The server stores the result under that key; a retry with the same key gets the stored result instead of a second charge, and the same key sent with a different body is rejected. This makes a `POST` safe to retry.
- **Idempotent consumers.** A consumer records the ids of the events it has processed, in the same transaction as its own change, and skips an id it has already seen.

## Common mistakes

- **Two-phase commit across microservices.** It holds locks across the network, blocks when the coordinator fails and makes every service a single point of failure for the whole transaction. Use a saga with compensations instead.
- **Compensating in the wrong order or compensating the failed step.** Undo completed steps in reverse order; the failed step rolled back its own local transaction.
- **Writing the database and then publishing the event.** A crash between the two loses the event; write it to an outbox in the same transaction.
- **Retrying payments without an idempotency key**, which turns one timeout into two charges.

## In practice

Draw the saga as a table before writing code: each step, its compensation, and whether it can be undone at all. Put irreversible steps last, give every step and compensation an idempotency key, publish events through an outbox and alert on sagas stuck with failed compensations.

## Check yourself

1. A saga charges the card and then fails to reserve the items. Which actions run, and in what order?
2. Why does a crash between `db.insert` and `broker.publish` lose an event, and how does the outbox prevent it?
3. A client retries `POST /payments` after a timeout. What does the server need so the card is charged only once?
