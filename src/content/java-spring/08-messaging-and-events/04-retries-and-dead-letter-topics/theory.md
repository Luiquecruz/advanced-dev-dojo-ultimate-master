# Retries and Dead Letter Topics

A consumer will receive messages it cannot process. A downstream service may be briefly unavailable, a record may carry invalid data, a bug may throw on one input. How the consumer reacts decides whether one bad message stalls a whole partition, floods a failing service with requests, or is safely set aside for a person to inspect. This lesson covers retries with backoff, the dead letter topic and the idempotency that makes reprocessing safe.

You need: Spring for Apache Kafka, The Transactional Outbox Pattern.

## Transient and permanent failures

Failures come in two kinds, and they need different answers:

- **Transient**: a timeout, a database failover, a rate limit. Trying again later will probably work.
- **Permanent**: a malformed payload, a missing required field, a business rule that can never pass. Retrying never helps and only delays everything behind it.

Retry transient failures with a pause between attempts. Send permanent ones to a dead letter topic immediately.

## Backoff

Retrying at once, in a tight loop, hammers a service that is already struggling. Backoff spaces the attempts. Exponential backoff doubles the wait each time (1 s, 2 s, 4 s, 8 s), giving the dependency time to recover. In Spring for Apache Kafka a `DefaultErrorHandler` takes a `BackOff`. Note that a plain `ExponentialBackOff` retries without end by default, so bound it:

```java
@Bean
DefaultErrorHandler errorHandler(KafkaTemplate<Object, Object> template) {
    ExponentialBackOffWithMaxRetries backOff = new ExponentialBackOffWithMaxRetries(3);
    backOff.setInitialInterval(1_000L);
    backOff.setMultiplier(2.0);
    backOff.setMaxInterval(10_000L);

    DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(template);
    DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backOff);
    handler.addNotRetryableExceptions(InvalidEventException.class);
    return handler;
}
```

With three retries the record is attempted four times in total. The handler blocks the partition while it retries, so keep the total wait modest. Exceptions registered as not retryable skip the retries and go straight to the recoverer.

## The dead letter topic

When retries are exhausted, the recoverer publishes the failed record to a dead letter topic (DLT). By default its name is the original topic with `.DLT` appended, for example `orders.placed.DLT`, and the record carries headers with the exception class, message and original topic, partition and offset. The main topic keeps flowing; the poison record waits in the DLT.

A dead letter topic is not a trash can. Someone must watch it: alert on its size, inspect the headers, fix the cause, and then replay the records, usually with a small tool or a temporary consumer that publishes them back to the main topic. An unwatched DLT is a silent data loss.

## Poison pills

A poison pill is a record that can never be processed, and the most common cause is a failure to deserialize it. Wrapping the deserializer with `ErrorHandlingDeserializer` turns that failure into an exception handled by the error handler, so the record reaches the DLT instead of crashing the consumer in a loop.

## Idempotency

Because a retry or a replay processes a record more than once, the handler must tolerate repeats. A straightforward approach is a processed-events table:

```java
@Transactional
void on(OrderPlaced event) {
    if (processed.existsById(event.eventId())) {
        return;
    }
    notifications.sendConfirmation(event.orderId());
    processed.save(new ProcessedEvent(event.eventId()));
}
```

Inserting the id and doing the work in one transaction, with a primary key on the id, means a concurrent duplicate fails on the insert instead of running twice. For side effects outside the database, such as an email, use the provider's own idempotency key when it offers one.

## Common mistakes

- Retrying forever or without a pause, which blocks a partition and attacks a failing dependency.
- Retrying permanent errors such as invalid payloads instead of sending them straight to the DLT.
- Having a dead letter topic nobody monitors or replays.
- Skipping an idempotency check and sending the same email twice after a replay, which customers notice immediately.

## In practice

Decide per exception whether it is retryable, bound the retries, name the DLT clearly and alert on any message in it. Test the path on purpose by publishing a malformed record and asserting that it arrives in the DLT after the planned attempts.

## Check yourself

1. What is the difference between a transient and a permanent failure, and what does each get?
2. Why does `ExponentialBackOff` need a bound in a Kafka consumer?
3. What must happen to a record in a dead letter topic after it arrives there?
