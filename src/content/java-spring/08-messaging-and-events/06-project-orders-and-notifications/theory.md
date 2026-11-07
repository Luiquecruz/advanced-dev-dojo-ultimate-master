# Project: Orders and Notifications

This project connects two Spring Boot applications through Kafka without losing events. An order service accepts orders over HTTP, stores them in PostgreSQL and records an event in an outbox table in the same transaction. A relay publishes the outbox to Kafka. A notification service consumes the events idempotently, retries transient failures and sends broken records to a dead letter topic. You build it locally with JDK 25, Maven and Docker.

You need: Messaging, Queues and Publish/Subscribe, Spring for Apache Kafka, The Transactional Outbox Pattern, Retries and Dead Letter Topics, Spring Cloud Stream.

## Goal

Create a Maven parent project `orders-platform` with two modules, `order-service` and `notification-service`, under the base package `com.example.orders`. The order service never calls Kafka inside its business transaction. The notification service never processes the same event twice, and a malformed record never blocks the topic. Check JDK 25, Maven 3.9 or later and Docker with `java -version`, `mvn -v` and `docker info`.

## Features

- A `docker-compose.yml` with PostgreSQL and one Kafka broker in KRaft mode, both published on `127.0.0.1`.
- `order-service`: `POST /api/orders`, Flyway migrations for `orders` and `outbox_event`, a service that writes both rows in one transaction, and a scheduled relay that publishes pending rows and marks them published.
- `notification-service`: a Kafka consumer in group `notifications` for the topic `orders.placed`, a `processed_event` table for idempotency and a simulated email sender.
- A `DefaultErrorHandler` with `ExponentialBackOffWithMaxRetries` (3 retries), `DeadLetterPublishingRecoverer` and a not-retryable exception for invalid events.
- Wrapped deserialization with `ErrorHandlingDeserializer` so malformed JSON becomes a handled failure.

## Acceptance criteria

Tests use Testcontainers for PostgreSQL and Kafka and run with `mvn verify`.

1. `POST /api/orders` with a valid body returns `201` and creates one order row and one pending outbox row in a single transaction.
2. If saving the outbox row fails, the order row is not committed either (test with a forced exception).
3. After the relay runs, the pending row has `published_at` set and the topic `orders.placed` holds one record with the order id as key.
4. The notification service sends one confirmation for that event, and the same record delivered twice sends it only once.
5. A record that fails with a transient exception twice and then succeeds is processed on the third attempt without reaching the dead letter topic.
6. A malformed JSON record is published to `orders.placed.DLT` after the attempts allowed by the policy, and the following valid record is still processed.
7. Stopping the notification service, placing five orders and starting it again results in five confirmations.
8. `mvn verify` passes from a clean checkout with both containers started by the tests.

## Suggested steps

1. Create the parent POM and the two modules with the dependencies each needs. Start Compose and check the broker with `docker compose ps`.
2. In `order-service`, write the Flyway migrations and the `Order` and `OutboxEvent` entities. Write the placement service and test criteria 1 and 2 before the relay exists.
3. Add the relay. Select pending rows with `FOR UPDATE SKIP LOCKED` in the relay's transaction, send the stored JSON text with a `KafkaTemplate<String, String>`, wait for the result, then mark them published. Test criterion 3.
4. In `notification-service`, add the consumer, the processed-events table and the idempotency check. Use the event id from the payload as the key of the processed row.
5. Add the error handler and the deserializer wrapper. Create a test that publishes invalid JSON directly with a `KafkaTemplate`.
6. Write the tests for criteria 4 to 7. For criterion 5, make the sender fail on its first two calls using a test double.
7. Document how to run both services and the Compose file in a short `README`.

## Stretch goals

- Replace the polling relay with Debezium and compare latency and moving parts.
- Rewrite the consumer as a Spring Cloud Stream function and compare the two versions.
- Add a metric with the number of unpublished outbox rows and an alert threshold.
- Add a small admin endpoint that replays records from the dead letter topic.

## Common mistakes

- Using the same consumer group name for two different services, so they split the events instead of each receiving all of them.
- Marking the outbox row published before Kafka confirms the send, which loses events after a crash.
- Testing only the happy path and never publishing a malformed record.
- Forgetting a unique constraint on the processed-events table, so two concurrent duplicates both pass the check.

## In practice

This is the backbone of many production systems: a reliable write, a reliable publish, an idempotent consumer and a visible failure path. The same shape works with another broker, and the tests you wrote are what let you change the infrastructure underneath.

## Check yourself

1. Which two rows are written in the single order transaction, and why is Kafka not called there?
2. How does the notification service avoid sending a confirmation twice?
3. What happens to the valid record that follows a malformed one?
