# Message Brokers: RabbitMQ, Kafka and Azure Service Bus

After this lesson you can explain how RabbitMQ, Apache Kafka and Azure Service Bus move a message from a producer to consumers, what "queue", "topic" and "partition" mean in each, how a consumer acknowledges work, and which broker fits a given job, and you can read the .NET client code for each.

## Coming from PHP/Magento

Magento's message queue framework splits a queue into XML files: `communication.xml` names the topics and their payload, `queue_publisher.xml` says which exchange a topic is published to, `queue_topology.xml` declares exchanges and bindings, and `queue_consumer.xml` attaches a handler class to a queue. The connection is usually `db` (MySQL tables) or `amqp` (RabbitMQ); current versions also support `stomp` for ActiveMQ Artemis. So if you have run Magento on RabbitMQ, you have already used exchanges, bindings and queues.

The trap is the word **topic**. In Magento it is the message name (`sales.order.placed`), used as a RabbitMQ routing key. In RabbitMQ a *topic exchange* routes by key patterns. In Kafka a topic is a partitioned, replayable log. In Service Bus a topic is a publish/subscribe entity with subscriptions. Same word, four different things.

The other difference is the client. Magento hides the broker behind `PublisherInterface` and config. In .NET you usually call the broker's own client library directly, or use a messaging framework on top of it (lesson 04).

## Two shapes of messaging

- **Point-to-point (competing consumers).** One queue, many consumer instances; each message goes to one of them. This spreads work: "reserve stock for order 42".
- **Publish/subscribe.** One published message, a copy for every interested subscriber. This announces facts: "order 42 was placed", consumed by stock, invoicing and e-mail independently.

Every broker below supports both, with different building blocks.

## RabbitMQ: exchanges, bindings, queues

Producers publish to an **exchange**, never directly to a queue. **Bindings** route messages from the exchange to queues by routing key. Exchange types are `direct` (exact key), `fanout` (every bound queue), `topic` (patterns such as `order.*`) and `headers`. The default exchange, named `""`, routes a message to the queue whose name equals the routing key.

A message is removed from a queue only when the consumer **acknowledges** it. If the consumer's channel or connection closes first, RabbitMQ redelivers the message to another consumer. A **quorum queue** is the replicated queue type RabbitMQ recommends when you need durability and high availability.

```csharp
using System.Text;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

var factory = new ConnectionFactory { HostName = "localhost" };
using IConnection connection = await factory.CreateConnectionAsync();
using IChannel channel = await connection.CreateChannelAsync();

await channel.QueueDeclareAsync("stock.reserve", durable: true, exclusive: false, autoDelete: false,
    arguments: new Dictionary<string, object?> { ["x-queue-type"] = "quorum" });
await channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 10, global: false);

var consumer = new AsyncEventingBasicConsumer(channel);
consumer.ReceivedAsync += async (_, ea) =>
{
    string json = Encoding.UTF8.GetString(ea.Body.Span);
    // ... reserve stock
    await channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
};
await channel.BasicConsumeAsync("stock.reserve", autoAck: false, consumer: consumer);
```

`RabbitMQ.Client` 7 is fully async (`CreateConnectionAsync`, `BasicPublishAsync`, `ReceivedAsync`); code written for 6.x uses `IModel` and synchronous methods. `prefetchCount` limits how many unacknowledged messages one consumer holds, which keeps work spread across instances. With `autoAck: true` the broker forgets the message as soon as it is sent, and a crash loses it.

## Kafka: a partitioned log

Kafka does not delete a message when it is consumed. A **topic** is an append-only log split into **partitions**; messages are kept for the topic's retention period and can be read again. A message's **key** picks its partition, so all events for one key (an order id, a customer id) land in the same partition, and order is guaranteed **within** a partition, not across the topic.

Consumers join a **consumer group**. Kafka distributes the partitions among the group's members, so a group can have at most as many active consumers as there are partitions; extra members sit idle. Each consumer tracks its position as an **offset** and commits it. Two groups reading the same topic each get every message, which is how Kafka does publish/subscribe.

```csharp
using Confluent.Kafka;

// ... in a long-running task started from ExecuteAsync(CancellationToken stoppingToken)
var config = new ConsumerConfig
{
    BootstrapServers = "localhost:9092",
    GroupId = "stock-service",
    AutoOffsetReset = AutoOffsetReset.Earliest,
    EnableAutoOffsetStore = false // auto-commit stays on; it commits only stored offsets
};

using IConsumer<string, string> consumer = new ConsumerBuilder<string, string>(config).Build();
consumer.Subscribe("orders");

while (!stoppingToken.IsCancellationRequested)
{
    ConsumeResult<string, string> result = consumer.Consume(stoppingToken);
    // ... handle result.Message.Key / result.Message.Value
    consumer.StoreOffset(result);
}
```

By default the consumer stores each offset when `Consume` returns and commits in the background, so a crash can skip a message mid-processing or repeat recent ones. Storing the offset after processing, as above, gives at-least-once delivery without the blocking per-message `Commit` that Confluent advises against. `Consume` blocks a thread, so keep the loop off the thread pool.

## Azure Service Bus: queues, topics and subscriptions

Service Bus is a managed broker. A **queue** is point-to-point. A **topic** has **subscriptions**; each subscription is like its own queue that receives a copy of every message, optionally filtered by rules. Topics need the Standard or Premium tier.

In the default **peek-lock** mode, a receiver gets a locked message and must **complete** it; **abandon** or an expired lock makes it available again. **Receive-and-delete** removes it on delivery (at-most-once). **Sessions** give first-in, first-out ordering for messages with the same `SessionId`.

```csharp
using Azure.Identity;
using Azure.Messaging.ServiceBus;

await using var client = new ServiceBusClient("<namespace>.servicebus.windows.net", new DefaultAzureCredential());
await using ServiceBusProcessor processor = client.CreateProcessor("orders",
    new ServiceBusProcessorOptions { AutoCompleteMessages = false, MaxConcurrentCalls = 4 });

processor.ProcessMessageAsync += async args =>
{
    string json = args.Message.Body.ToString();
    // ... handle the order
    await args.CompleteMessageAsync(args.Message);
};
processor.ProcessErrorAsync += args =>
{
    Console.WriteLine(args.Exception);
    return Task.CompletedTask;
};

await processor.StartProcessingAsync();
```

`ServiceBusClient` is safe to keep as a singleton for the life of the app, which is Microsoft's recommendation. `DefaultAzureCredential` (passwordless, through Microsoft Entra ID) is recommended over connection strings in production.

## In practice

| Question | RabbitMQ | Kafka | Azure Service Bus |
| --- | --- | --- | --- |
| Main model | queues fed by exchanges | partitioned, retained log | managed queues and topics |
| Message after processing | deleted on ack | kept until retention expires | deleted on complete |
| Ordering | per queue, broken by competing consumers | per partition (by key) | per session |
| Replay old messages | no (streams aside) | yes, reset the offset | no |
| Runs | self-hosted, containers, managed offerings | self-hosted, Confluent Cloud, managed offerings | Azure only |

- Use **RabbitMQ** or **Service Bus** for commands and work queues: "do this once". Use **Kafka** for high-volume event streams that several systems read, or replay, at their own pace.
- Pick the broker your platform already runs. A team on Azure rarely gains from self-hosting RabbitMQ; a team with Kafka for analytics may still want a queue for commands.
- Keep one long-lived connection per process (RabbitMQ `IConnection`, Kafka producer, `ServiceBusClient`) instead of one per message.
- Usual mistakes: auto-ack or auto-commit with work that must not be lost, expecting global order from several consumers, and one partition (or one queue consumer) for a workload that must scale.

## Status as of 2026-11-05

- NuGet clients: `RabbitMQ.Client` 7.2.2 (Apache-2.0 or MPL-2.0), `Confluent.Kafka` 2.16.0 (Apache-2.0), `Azure.Messaging.ServiceBus` 7.21.0 (MIT).
- RabbitMQ 4.x is the current server series (Docker Hub shows `4.4` tags).

## Check yourself

1. What does "topic" mean in Magento, RabbitMQ, Kafka and Service Bus?
2. Why does adding a fifth consumer to a Kafka group reading a four-partition topic not increase throughput?
3. What happens to an unacknowledged RabbitMQ message when the consumer process crashes, and to a Service Bus message whose lock expires?
4. Which broker would you pick to let a new analytics service read the last seven days of order events, and why?
