# Messaging, Queues and Publish/Subscribe

Every API you built so far answers a request and waits for the next one. Many real tasks do not fit that shape: sending an email after an order, updating a search index, notifying another system. Doing them inside the request makes the user wait and ties the request to every system it calls. Messaging moves that work out of the request: one part of the system publishes a message, and another part handles it later, at its own pace.

You need: REST Controllers, Transactions.

## Synchronous and asynchronous calls

An HTTP call is synchronous: the caller waits for the answer and fails if the other side is down. A message is asynchronous: the producer hands it to a broker, a server that stores messages, and continues. The consumer reads it when it is ready. This gives you three things:

- **Temporal decoupling**: the consumer can be down or slow, and the producer still works.
- **Smoothing**: a traffic spike becomes a backlog that the consumer drains, instead of an overload.
- **Fan-out**: one event can be handled by several independent consumers.

It also costs you something. The result is not immediate, so the user cannot see it in the same response. Messages can arrive late, twice or out of order, and debugging spans several processes. Use messaging for work that can wait, not for a request where the client needs the answer to draw the next screen.

## Two models

**Queues** (the classic AMQP model, used by RabbitMQ) deliver each message to one consumer among those reading the queue. When the consumer acknowledges the message with an `ACK`, the broker deletes it. Queues suit task distribution: ten workers share a list of jobs.

**Logs** (Apache Kafka) append events to a topic that is split into partitions. Messages are not deleted when read; they stay for a retention period, and each consumer group tracks its own position, called an offset. Many groups can read the same events independently, and a new group can replay history.

| | Queue | Log |
| --- | --- | --- |
| After a read | Message removed on ACK | Message retained |
| Several readers | Compete for messages | Each group gets all messages |
| Replay | Not available | Reset the offset |
| Ordering | Per queue, loosely | Per partition |

## Publish/subscribe

In publish/subscribe a producer publishes an event, such as `OrderPlaced`, without knowing who listens. Any number of subscribers react: billing, email, analytics. Adding a new reaction means adding a subscriber, not editing the producer. Name events as facts that already happened, in the past tense, and keep their payload stable, because other teams depend on it.

## Delivery guarantees

A message system cannot give you everything for free. The common guarantees are:

- **At most once**: a message may be lost but is never repeated.
- **At least once**: a message is never lost but may be delivered more than once.
- **Exactly once**: processed once, which in practice needs cooperation between broker and consumer and applies only inside narrow boundaries.

Most systems choose at least once, because losing business events is worse than receiving a duplicate. The consequence is that consumers must be idempotent: handling the same message twice must leave the same result as handling it once. A later lesson returns to this.

## Common mistakes

- Using a message for a request where the client needs the result immediately.
- Treating Kafka like a queue and expecting messages to disappear after being read.
- Assuming messages arrive exactly once and in a global order. Order holds only inside one partition.
- Publishing events with unstable or private payloads that other consumers then depend on, which turns every later change into a coordinated release.

## In practice

Start by moving one slow, non-urgent side effect out of a request, such as sending a confirmation. Define the event name and payload as a contract, make the consumer idempotent, and monitor the backlog so you notice when it stops draining.

## Check yourself

1. Which two benefits of asynchronous messaging do you get over a direct HTTP call, and what is one cost?
2. What happens to a message after a consumer reads it in a queue, and in a Kafka topic?
3. Why must consumers be idempotent under at-least-once delivery?
