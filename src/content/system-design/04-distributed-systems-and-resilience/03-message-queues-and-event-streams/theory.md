# Message Queues & Event Streams

A queue lets one service hand work to another without waiting for it: the producer writes a message and moves on, and consumers process it at their own pace. That decoupling absorbs traffic spikes and keeps a slow dependency from slowing every request, but it comes with its own rules. Messages can arrive twice, out of order or never, and a design that ignores those rules loses or duplicates data. This lesson covers queues, log-based event streams and the delivery guarantees you can actually rely on.

You need: Client-Server Architecture & HTTP Basics (idempotent requests) and Scaling from Zero to One Million Users (queues decouple producers from consumers).

## Point-to-point and publish/subscribe

There are two ways to deliver a message:

- **Point-to-point**: each message goes to exactly one of the consumers reading the queue. Add consumers and they share the work. This fits jobs: resize this image, send this email.
- **Publish/subscribe**: each message goes to every subscriber. An `OrderPlaced` event reaches billing, shipping and analytics, each with its own copy. This fits events: something happened, and several parts of the system care.

## Message queues

A **message queue** such as Amazon SQS or RabbitMQ stores messages until a consumer acknowledges them, then deletes them. A consumer **receives** a message, processes it and **acknowledges** it (in SQS, by deleting it).

The interesting part is what happens between receive and acknowledge. In SQS, a received message stays in the queue but becomes invisible for a **visibility timeout**. If the consumer crashes or takes too long, the timeout expires and the message becomes visible again for another consumer: it is **redelivered**. RabbitMQ redelivers unacknowledged messages when the consumer's channel or connection closes. Either way the broker cannot know whether the work was done before the crash, so it delivers again.

A message that fails every time (a malformed payload, a bug) keeps coming back and wastes capacity on every attempt, until the queue's **retention period** (how long it keeps any message) runs out and deletes it unprocessed. A **dead-letter queue** (DLQ) catches it: after a maximum number of receives, SQS moves the message to a separate queue (RabbitMQ can route rejected or expired messages to a dead-letter exchange). Someone inspects it, fixes the cause and replays it. Alert on DLQ depth: a message there is a bug you have not seen yet.

## Log-based event streams

**Apache Kafka** works differently. A **topic** is split into **partitions**, and each partition is an append-only log. Every message gets an increasing **offset** in its partition. Consuming does not delete anything: a consumer just remembers the offset it has processed up to and commits it.

- **Retention**: messages stay for a configured time or size, whether or not anyone read them.
- **Replay**: a consumer can reset its offset and read history again, to rebuild a cache, fix a bug in a projection or feed a new service.
- **Consumer groups**: the partitions of a topic are divided among the consumers of a group, and each partition is read by one consumer of the group at a time. Two different groups each read the whole topic: that is publish/subscribe.
- **Ordering**: guaranteed only within a partition. Messages with the same key (an order id) go to the same partition, so the events of one order stay in order as long as the number of partitions does not change; there is no global order across partitions.

Choose a queue for jobs that are done once and forgotten, with per-message acknowledgement and dead-lettering. Choose a log when several consumers need the same events, when you need replay, or when order per key matters.

## Delivery guarantees

- **At-most-once**: acknowledge (or commit the offset) before processing. A crash loses the message, but it is never processed twice.
- **At-least-once**: process first, acknowledge after. A crash between the two means the message is delivered again. This is the practical default of most systems.
- **Exactly-once** exists only within bounded scopes: Kafka transactions can make a read-process-write cycle inside Kafka atomic, and some queues deduplicate messages with the same id within a window. As soon as the effect leaves that scope (a charge on a card, an email, a row in your database) you are back to at-least-once.

The answer is an **idempotent consumer**: each message carries a unique id (a deduplication key), and the consumer records which ids it has processed, ideally in the same database transaction as the effect itself. A redelivered message finds its id already recorded and is skipped. The effect happens once even though delivery happened twice. When the effect lives in another system, such as a charge at a payment provider, no local transaction can include it: pass the message id along as an **idempotency key**, an id that system stores with the charge so it recognizes the repeated request and skips it.

## Backpressure and consumer lag

When producers write faster than consumers process, the backlog grows. **Consumer lag** measures it: in Kafka, the distance between the newest offset and the committed offset of each partition; in a queue, the number of visible messages and the age of the oldest one. Respond by adding consumers (in Kafka, at most one per partition is useful within a group) and, when that is not enough, with **backpressure**: slow down or reject producers, or shed low-priority work. A queue hides a slow consumer only until the backlog is older than anyone is willing to wait, or older than the retention period.

## Common mistakes

- **Assuming exactly-once delivery.** A consumer that crashes after the effect but before the acknowledgement gets the message again. Without an idempotent consumer, a customer is charged twice or an email goes out twice.
- **Acknowledging before processing** to avoid duplicates, which silently turns the queue into at-most-once and loses messages on every crash.
- **A visibility timeout shorter than the processing time**: healthy consumers receive messages that are still being processed, and every slow job runs twice.
- **No dead-letter queue**: a poison message keeps coming back until its retention period ends, wasting capacity, and nobody notices.

## In practice

Design every consumer as if each message will arrive at least twice: give messages ids, record processed ids with the effect, and set the visibility timeout above the slowest normal processing time (or extend it while a long job runs). Configure a DLQ with an alert, monitor lag or the age of the oldest message, and pick a partition key that keeps related events in order without sending most traffic to one partition.

## Check yourself

1. A consumer charges a card and then crashes before acknowledging. What happens next, and what makes the second delivery harmless?
2. Three services need every `OrderPlaced` event, and a new service must be able to read the last week of events. Queue or log, and why?
3. Why does adding a fifth consumer to a group reading a four-partition Kafka topic not increase throughput?
