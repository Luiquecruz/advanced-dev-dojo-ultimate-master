# Spring for Apache Kafka

Kafka stores events in topics and lets many applications read them independently. Spring for Apache Kafka wraps the plain client with a template for sending and an annotation for receiving, so a service can publish and consume events with a few lines. This lesson covers the Kafka vocabulary you need and the Spring Boot 4 setup for a producer and a consumer.

You need: Messaging, Queues and Publish/Subscribe, Configuration and Profiles.

## Topics, partitions and keys

A topic is a named stream of records. It is divided into partitions, and each partition is an ordered, append-only log. Each record gets an increasing offset within its partition. Two rules shape every design:

- **Ordering holds only inside a partition.** There is no global order across a topic.
- **The record key picks the partition.** Records with the same key go to the same partition, so they stay in order. Use the entity id, such as the order id, as the key when events of one entity must be processed in order.

A consumer group is a set of application instances that share a topic. Kafka assigns each partition to exactly one consumer in the group, so the group's parallelism is limited by the number of partitions. With three partitions and four instances, one instance stays idle. Two different groups each receive every record.

## Running Kafka locally

Recent Kafka versions run in KRaft mode, which needs no separate coordination service. A single-node container is enough for development, and the project in this module shows the full Compose file. Publish the broker only on `127.0.0.1`.

## Producing events

Add `spring-boot-starter-kafka`, the Boot 4 starter for Spring for Apache Kafka, and set the bootstrap address:

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
```

Spring Boot gives you a `KafkaTemplate`. Its `send` methods return a `CompletableFuture`, because the client sends in the background:

```java
@Service
public class OrderEventPublisher {

    private final KafkaTemplate<String, OrderPlaced> kafka;

    public OrderEventPublisher(KafkaTemplate<String, OrderPlaced> kafka) {
        this.kafka = kafka;
    }

    public void publish(OrderPlaced event) {
        kafka.send("orders.placed", event.orderId(), event)
                .whenComplete((result, error) -> {
                    if (error != null) {
                        log.error("Publish failed for order {}", event.orderId(), error);
                    }
                });
    }
}
```

Never ignore the result. If you do not check the future, a failure disappears silently. The next lesson explains why this call is also unsafe next to a database write.

## Consuming events

A listener method receives records from a topic as part of a consumer group:

```java
@Component
class NotificationListener {

    @KafkaListener(topics = "orders.placed", groupId = "notifications")
    void on(OrderPlaced event) {
        sendEmailFor(event.orderId());
    }
}
```

Spring starts a listener container that polls the broker, calls your method and commits the offset after the method returns normally. Configure the consumer to read JSON into your event type with the JSON deserializer, and wrap it in `ErrorHandlingDeserializer`. Without that wrapper, one malformed record fails to deserialize before your method runs, and the consumer retries the same record forever: a poison pill.

## Idempotent consumers

Because delivery is at least once, a record can arrive twice, after a rebalance or a crash between processing and committing. Make the handler safe to repeat: keep a table of processed event ids and skip those already seen, or design the operation so repeating it changes nothing, such as setting a status instead of incrementing a counter.

## Common mistakes

- Not wrapping the deserializer in `ErrorHandlingDeserializer`, so one bad record blocks a partition.
- Starting more consumers in a group than there are partitions, which leaves instances idle.
- Ignoring the future returned by `send`, so publishing failures go unnoticed.
- Choosing a random or missing key and then expecting events of one order to stay in order, because records without a shared key may land in different partitions.

## In practice

Pick keys deliberately, create topics with a planned number of partitions, and treat the event record as a versioned contract. Log the topic, partition and offset when a handler fails, so you can find the exact record.

## Check yourself

1. Why is ordering guaranteed only per partition, and how does the key help?
2. What happens to the fourth instance of a group that reads a three-partition topic?
3. What does `ErrorHandlingDeserializer` protect the consumer from?
