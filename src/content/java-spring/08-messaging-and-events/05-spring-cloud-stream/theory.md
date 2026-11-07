# Spring Cloud Stream

With Spring for Apache Kafka, your code talks about topics, partitions and offsets. That is precise, but it ties the business logic to one broker. Spring Cloud Stream takes another approach: you write plain Java functions that transform events, and configuration connects those functions to a broker. Swapping Kafka for RabbitMQ then becomes a dependency and configuration change instead of a rewrite. This lesson shows the model, the naming rules and the trade-off against using the Kafka client directly.

You need: Spring for Apache Kafka, Retries and Dead Letter Topics.

## Functions as handlers

In the functional model, a message handler is a bean of a standard `java.util.function` type:

- `Consumer<T>` receives events and produces nothing.
- `Function<T, R>` receives an event and produces another one.
- `Supplier<R>` produces events, polled on a schedule.

```java
@Configuration
class NotificationFunctions {

    @Bean
    Consumer<OrderPlaced> sendConfirmation(NotificationService notifications) {
        return event -> notifications.sendConfirmation(event.orderId());
    }

    @Bean
    Function<OrderPlaced, Notification> toNotification() {
        return event -> new Notification(event.orderId(), "Your order was received");
    }
}
```

The handler knows nothing about Kafka. It is easy to unit test by calling the function directly.

## Bindings

A binding connects a function's input or output to a destination, which Kafka calls a topic. Bindings are named from the function and the position:

- `<functionName>-in-<index>` for input.
- `<functionName>-out-<index>` for output.

The index is 0 unless a function has several inputs or outputs. You declare which function beans are active and configure their bindings in `application.yml`:

```yaml
spring:
  cloud:
    function:
      definition: sendConfirmation
    stream:
      bindings:
        sendConfirmation-in-0:
          destination: orders.placed
          group: notifications
```

`destination` is the topic and `group` is the consumer group. A mistake in the binding name is the most common error: the application starts, but the function is never connected because no binding with that name exists. To publish from application code, use `StreamBridge`:

```java
streamBridge.send("orderPlaced-out-0", new OrderPlaced(order.id()));
```

## Binders

A binder is the adapter between the binding abstraction and a specific broker. You choose one by dependency: the Kafka binder or the RabbitMQ binder. Broker-specific settings live under that binder's property namespace, for example `spring.cloud.stream.kafka.binder.brokers`. Retry and dead letter behavior is configured on the consumer binding as well (for example, `max-attempts` and the Kafka binder's `enable-dlq`), so the ideas from the previous lesson carry over with different property names.

Use the Spring Cloud release train that matches your Spring Boot version, and let the Spring Cloud dependency management supply the Stream version instead of pinning it yourself.

## Choosing between the two

| | Spring for Apache Kafka | Spring Cloud Stream |
| --- | --- | --- |
| Level | Kafka concepts directly | Functions and bindings |
| Portability | Kafka only | Switch binders |
| Control | Full control of the client | Some Kafka features need binder-specific settings |
| Testing | Needs a broker or embedded broker | Functions are plain Java |

Pick Spring Cloud Stream when the application is mostly event transformation and you value portability. Pick Spring for Apache Kafka when you need fine control over partitions, transactions or the client. Do not mix `@KafkaListener` and function bindings on the same topic and group within one application, because it is unclear which one owns the consumption.

## Common mistakes

- Misspelling the binding name, so the function is never connected and nothing is consumed.
- Forgetting `spring.cloud.function.definition` when the application has more than one function bean.
- Mixing `@KafkaListener` and function bindings on the same destination and group.
- Assuming every Kafka feature is portable. Broker-specific settings still belong to the binder, so keep a list of the ones you use before you plan a migration.

## In practice

Keep the functions small and pure, put the business logic in services they call, and test the functions without any broker. Add one integration test per binding that proves a message on the destination reaches the function.

## Check yourself

1. What are the binding names for the input and output of a function called `toNotification`?
2. What does a binder do, and how do you choose one?
3. Name one situation where you would use the Kafka client directly instead of Spring Cloud Stream.
