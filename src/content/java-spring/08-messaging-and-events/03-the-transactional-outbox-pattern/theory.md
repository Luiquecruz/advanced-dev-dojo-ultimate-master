# The Transactional Outbox Pattern

A common use case does two things: save an order in the database and publish an `OrderPlaced` event. Each step is easy, but together they hide a trap. The database and the broker are two separate systems, and no ordinary transaction covers both. If one succeeds and the other fails, the system is inconsistent: an order nobody hears about, or an event for an order that does not exist. The transactional outbox is the standard way out.

You need: Spring for Apache Kafka, Transactions, Database Migrations and Soft Delete.

## The dual write problem

Consider this service method:

```java
@Transactional
public void place(NewOrder order) {
    orders.save(order);
    kafka.send("orders.placed", order.id(), new OrderPlaced(order.id()));
}
```

Several things can go wrong:

- The send succeeds, then the commit fails. The database has no order, but consumers received an event about it.
- The commit succeeds, then the application crashes before the send completes. The order exists and nobody was told.
- The send is asynchronous, so it can fail after the method has already returned successfully.

Wrapping both in one distributed transaction is possible in theory, but it is slow, fragile and rarely supported. The pattern instead keeps everything in the one place that can be transactional: the database.

## The outbox table

Add a table to the same database as the business data. Inside the same local transaction that saves the order, insert a row that describes the event:

```sql
CREATE TABLE outbox_event (
    id           UUID PRIMARY KEY,
    aggregate_id VARCHAR(64)  NOT NULL,
    topic        VARCHAR(120) NOT NULL,
    payload      TEXT         NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL,
    published_at TIMESTAMPTZ
);
CREATE INDEX outbox_pending ON outbox_event (created_at) WHERE published_at IS NULL;
```

```java
@Transactional
public void place(NewOrder order) {
    orders.save(order);
    outbox.save(OutboxEvent.of("orders.placed", order.id(), new OrderPlaced(order.id())));
}
```

Now the order and its event are written atomically: both commit or both roll back. Nothing is sent to Kafka inside the transaction.

## The relay

A separate component reads pending rows and publishes them. The simplest version is a polling publisher, a scheduled task:

```java
@Scheduled(fixedDelay = 1000)
void relay() {
    for (OutboxEvent event : outbox.findNextPending(100)) {
        kafka.send(event.topic(), event.aggregateId(), event.payload()).join();
        event.markPublished(clock.instant());
    }
}
```

The relay marks a row published only after Kafka confirms the send, so a crash in between causes the event to be sent again, never lost. Use `SELECT ... FOR UPDATE SKIP LOCKED` in the query when several relay instances run, so they do not publish the same rows. The alternative is change data capture: a tool such as Debezium reads the database log and publishes outbox rows without polling. It reduces latency and load but adds infrastructure to operate.

## What you get and what you owe

The outbox gives at-least-once delivery from the database to the broker: if a send is repeated after a crash, consumers see the same event twice. This is the reason consumers must be idempotent, using the event id to detect repeats. You also owe housekeeping: delete or archive published rows after some time, or the table grows without limit.

Ordering of events for one entity is preserved if the relay publishes rows in creation order and uses the entity id as the Kafka key.

## Common mistakes

- Sending to Kafka inside the `@Transactional` method and calling it consistent. A rollback does not unsend the message.
- Putting the outbox table in a different database from the business data, which brings back the dual write.
- Never cleaning old outbox rows, so queries slow down.
- Assuming consumers will never see duplicates, and skipping an event id check.

## In practice

Use an outbox whenever a state change in your database must reliably produce a message. Keep the payload small and versioned, index only the pending rows, and expose the count of unpublished events as a metric, because a growing number is an early warning that the relay or the broker is failing.

## Check yourself

1. Why can a single `@Transactional` method not make a database write and a Kafka send atomic?
2. In which transaction is the outbox row written, and why does that solve the problem?
3. Why does the outbox produce duplicates, and who must handle them?
