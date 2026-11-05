# Project P5: Order Processing Worker

In this project you add asynchronous order processing to the catalog API from P2–P4. The API publishes an `OrderPlaced` message to RabbitMQ, and a separate Worker Service consumes it, reserves stock idempotently and sends poison messages to a dead-letter queue.

## Coming from PHP/Magento

In Magento this would be a `communication.xml` topic, a `queue_topology.xml` binding, a `queue_consumer.xml` handler and `bin/magento queue:consumers:start`. Here each becomes code you own: the worker and a RabbitMQ policy declare the queue and its dead-letter route, the handler is a scoped class, and the consumer loop is a `BackgroundService`. Drop two habits: assuming the consumer restarts after N messages (this one runs for days, so scopes are per message) and assuming the broker never delivers twice (it does, so the handler is idempotent).

## Goal

A message-driven flow where `POST /orders` returns quickly and stock is reserved in the background exactly once per order, even when the same message arrives twice, a message is malformed or the worker is stopped mid-flight.

## Features

- **What changes from P4.** Two projects join the solution: `src/Catalog.Infrastructure`, a class library that now holds `CatalogDbContext`, its entity configuration and the `Migrations` folder moved out of `Catalog.Api`, and `src/Orders.Worker`. Both apps reference it, and `OrderPlaced` lives in `Catalog.Core`. The stock model stays P3's conditional `ExecuteUpdateAsync`, so stock never goes negative. The catalog endpoints, their status codes and P4's `admin` policy are unchanged; `POST /orders` is new.
- **Broker in Docker.** RabbitMQ 4.x with the management UI: `docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:4-management`. Reuse the PostgreSQL (or SQL Server) container from P3. Azure Service Bus is an accepted alternative (queue, `MaxDeliveryCount`, dead-letter subqueue).
- **Publisher in the API.** `POST /orders` requires an authenticated user through plain `RequireAuthorization()` (any token from `dotnet user-jwts create`; `admin` stays reserved for catalog writes). It returns 400 for a line quantity below 1, as P3 does, then saves an `Order` (id, `MessageId`, `Status` `Pending`) with its `OrderLine` rows (SKU, quantity), publishes `OrderPlaced` (order id, lines with SKU and quantity) with a persistent message and a `MessageId` equal to the GUID stored with the order, and returns `202 Accepted` with the order id.
- **Worker Service.** `Orders.Worker`, a `dotnet new worker` project with a `BackgroundService` that keeps one RabbitMQ connection, declares the quorum queue `orders.reserve-stock`, sets a prefetch count and consumes with `autoAck: false`.
- **Scope per message.** For each delivery the consumer creates an `AsyncServiceScope`, resolves a scoped `ReserveStockHandler` and the `DbContext`, and logs a scope id (a GUID created by a scoped service) with `ILogger.BeginScope`.
- **Idempotent handler.** In one transaction from `Database.BeginTransactionAsync`, the handler skips the message if `ProcessedMessages` (keyed by `(MessageId, Consumer)`) already has it, decrements each line's stock with P3's conditional `ExecuteUpdateAsync` (it runs immediately, so only the explicit transaction ties it to the rest), sets the order to `Reserved`, inserts the `ProcessedMessages` row, calls `SaveChangesAsync` and commits. A duplicate is acknowledged without touching stock; the primary key catches two copies handled at once. A quantity below 1 also throws before any update, since a negative one would add stock. A line that updates no row is either an unknown SKU, which throws (a poison message), or insufficient stock: the handler rolls back, sets the order to `Rejected` with its `ProcessedMessages` row, and acknowledges.
- **Failure routing.** Success: `BasicAckAsync`. Transient or unknown failure: `BasicRejectAsync(tag, requeue: true)`, so the failed delivery counts. A RabbitMQ policy sets `delivery-limit` 3 and a dead-letter exchange that routes to `orders.reserve-stock.dlq`. Pitfall: requeued messages return at once, so a database outage longer than three quick redeliveries dead-letters valid orders; the delayed retry stretch goal fixes this.

```csharp
consumer.ReceivedAsync += async (_, ea) =>
{
    await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
    var handler = scope.ServiceProvider.GetRequiredService<ReserveStockHandler>();
    try
    {
        await handler.HandleAsync(ea.BasicProperties.MessageId, ea.Body, stoppingToken);
        await channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
    }
    catch (Exception ex) when (ex is not OperationCanceledException)
    {
        logger.LogError(ex, "Reserve stock failed for {MessageId}", ea.BasicProperties.MessageId);
        await channel.BasicRejectAsync(ea.DeliveryTag, requeue: true);
    }
};
```

The policy, applied once after the broker starts:

```bash
docker exec rabbitmq rabbitmqctl set_policy orders-poison '^orders\.reserve-stock$' \
  '{"dead-letter-exchange":"orders.dlx","delivery-limit":3}' --apply-to quorum_queues
```

The worker declares the `orders.dlx` exchange and binds `orders.reserve-stock.dlq` to it at startup.

## Acceptance criteria

Run the API and the worker with `dotnet run`.

1. `POST /orders` with a non-admin token and two lines returns `202 Accepted` with the order id; within a few seconds the order's status in the database is `Reserved` and each product's stock has dropped by the ordered quantity. The same request with no token returns `401`.
2. Publishing the **same** message twice (same body and `message_id`, from the management UI at `http://localhost:15672` or a console publisher) reserves stock once. The worker log shows one "reserved" entry and one "duplicate skipped" entry for that `MessageId`.
3. A poison message (a body that is not valid JSON, or an unknown SKU) is delivered 4 times, the original plus 3 retries, and then appears in `orders.reserve-stock.dlq`: `docker exec rabbitmq rabbitmqctl list_queues name messages` shows it there and none in `orders.reserve-stock`.
4. The worker log shows a different scope id for every message, or a test asserts that two messages get two different `DbContext` instances.
5. Stopping the worker with Ctrl+C while a message is being handled does not lose it: after a restart it is processed, and stock is still reserved only once.
6. `dotnet test` passes, including a handler test against a real database (Testcontainers, as in P4) that calls `HandleAsync` twice with the same `MessageId` and asserts a single reservation.

## Suggested steps

1. Define the `OrderPlaced` contract as a record in `Catalog.Core`. Create `Catalog.Infrastructure`, move the `DbContext`, entities and migrations into it; `dotnet ef migrations has-pending-model-changes` must report no changes, and the P4 tests must stay green.
2. Add the `Order`, `OrderLine` and `ProcessedMessages` entities with one migration (module 07). Keep P3's row version on `Product`: the worker's `ExecuteUpdateAsync` bumps it too, so a `PUT` with a version read before a reservation returns 409.
3. Write `ReserveStockHandler` and its Testcontainers test first, without any broker. Get criterion 6 green.
4. Create the worker, declare the queues, add the consumer loop with a scope per message and the ack/reject logic.
5. Add the publisher to the API. Register one RabbitMQ connection as a singleton and create channels from it, not a connection per request.
6. Apply the policy, then walk through criteria 1 to 5 by hand.

## Stretch goals

- Replace the direct publish with a transactional outbox and a relay `BackgroundService` in the API (lesson 04), and show that orders saved while RabbitMQ is stopped are published once it is back.
- Add a delayed retry for transient errors (a retry queue with a message TTL that dead-letters back into the main queue), and dead-letter validation errors immediately.
- Run two worker instances: messages are shared between them and duplicates stay harmless.
- Port the consumer to Azure Service Bus with `ServiceBusProcessor`, `AutoCompleteMessages = false` and `MaxDeliveryCount` set to 4.

## Where to get help

- This module: lesson 01 (hosted services and scopes), lesson 03 (RabbitMQ client), lesson 04 (idempotency, dead letters, outbox).
- Module 05 lesson 02 (lifetimes), module 07 (EF Core, migrations, transactions), module 09 lesson 04 (Testcontainers).
- Microsoft: [Background tasks with hosted services](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-10.0) and the [Idempotent Consumer pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/idempotent-consumer).
- RabbitMQ: the [.NET work queues tutorial](https://www.rabbitmq.com/tutorials/tutorial-two-dotnet) and [dead letter exchanges](https://www.rabbitmq.com/docs/dlx).

## Check yourself

1. Which acceptance criterion would fail if the handler were injected into the `BackgroundService` constructor instead of resolved from a scope per message?
2. Why does the consumer call `BasicRejectAsync` rather than `BasicNackAsync` on failure, and what would criterion 3 show otherwise?
3. Criterion 5 relies on two mechanisms together. Which ones?
4. Without the outbox stretch goal, which failure can still lose an order's message, and how would you detect it?
