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
@Transactional
void relay() {  // kafka is a KafkaTemplate<String, String>
    for (OutboxEvent event : outbox.claimNextPending(100)) {
        kafka.send(event.topic(), event.aggregateId(), event.payload()).join();
        event.markPublished(clock.instant());
    }
}
```

The payload contract matters. The `payload` column holds the event as JSON text, so the relay publishes that text unchanged with a `KafkaTemplate<String, String>`, which uses string serializers and adds no type header. Consumers read the JSON into the event type, as the Kafka lesson showed with `spring.json.use.type.headers` set to `false` and a default type, so a record published by the relay and one published directly with the JSON serializer look the same to them. Serializing the payload again with the JSON serializer would turn the text into a quoted JSON string, which no consumer can map to `OrderPlaced`.

`claimNextPending` runs `SELECT ... FOR UPDATE SKIP LOCKED` inside the relay's transaction. The selected rows are locked until the commit, so other relay instances skip them and do not publish the same events, and `markPublished` on these managed entities is written to the database when the transaction commits. The relay marks a row published only after Kafka confirms the send, so a crash before the commit leaves the rows pending and the events are sent again, never lost. The trade-off is that the transaction stays open while Kafka answers, so keep the batch small and set a send timeout. The alternative is change data capture: a tool such as Debezium reads the database log and publishes outbox rows without polling. It reduces latency and load but adds infrastructure to operate.

## What you get and what you owe

The outbox gives at-least-once delivery from the database to the broker: if a send is repeated after a crash, consumers see the same event twice. This is the reason consumers must be idempotent, using the event id to detect repeats. You also owe housekeeping: delete or archive published rows after some time, or the table grows without limit.

Ordering of events for one entity is preserved only with a single relay: it publishes rows in creation order and uses the entity id as the Kafka key. With several relay instances and `SKIP LOCKED`, one instance can still hold an older row of an entity while another claims and sends a newer one, so consumers that depend on per-entity order must check a sequence number or the event version.

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
