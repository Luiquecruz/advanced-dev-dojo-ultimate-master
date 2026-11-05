# Reliable Messaging: Idempotency, Retries, Dead Letters and the Outbox

After this lesson you can design for at-least-once delivery: a consumer that absorbs duplicates, retries that separate transient from permanent failures, a dead-letter path for poison messages, and a transactional outbox so that a saved order always produces its message. You also know where MassTransit stands after its licence change.

## Coming from PHP/Magento

A typical Magento flow saves the order and then calls `$publisher->publish('sales.order.placed', $data)`. Two writes, two systems, no shared transaction. If the broker is down after the save, the order exists and nobody is told. If the publish happens inside a transaction that later rolls back, consumers act on an order that does not exist. And a consumer that crashes before acknowledging gets the message again.

None of this changes in .NET: you design for it explicitly, with the patterns below. The trap is believing that broker features solve it. Duplicate detection or a quorum queue reduce duplicates and loss, but they cannot make your database write and your message happen together.

## Delivery guarantees

- **At-most-once**: acknowledge before processing (RabbitMQ `autoAck`, Service Bus receive-and-delete). A crash loses the message.
- **At-least-once**: acknowledge after processing. A crash between the work and the acknowledgement redelivers the message. This is the default of RabbitMQ, Kafka and Service Bus used correctly.
- **Effectively-once**: at-least-once delivery plus a consumer that ignores duplicates. Exactly-once delivery across a broker and your database is impractical; effectively-once processing is the goal.

So the rule is: **every consumer must be idempotent**. Producers retry sends, brokers redeliver after lost acknowledgements, and operators resubmit dead letters.

## Idempotent consumers

Some work is idempotent by nature: setting an order's status to `Paid`, an upsert keyed by order id. Increments are not: `Reserved += quantity` applied twice reserves twice. For those, record the message id **in the same transaction** as the side effect, with a unique key that rejects the second attempt (the inbox pattern).

```csharp
public sealed class ProcessedMessage
{
    public required Guid MessageId { get; init; }
    public required string Consumer { get; init; }
    public DateTime ProcessedAtUtc { get; init; } = DateTime.UtcNow;
}

// In OnModelCreating:
// modelBuilder.Entity<ProcessedMessage>().HasKey(m => new { m.MessageId, m.Consumer });

// ... a method of a scoped handler class whose `db` is the ShopDbContext
public async Task HandleAsync(OrderPlaced message, Guid messageId, CancellationToken ct)
{
    const string consumer = "stock-reservation";
    if (await db.ProcessedMessages.AnyAsync(m => m.MessageId == messageId && m.Consumer == consumer, ct))
        return; // duplicate: acknowledge and stop

    foreach (OrderLine line in message.Lines)
    {
        Product product = await db.Products.SingleAsync(p => p.Sku == line.Sku, ct);
        product.Reserved += line.Quantity;
    }

    db.ProcessedMessages.Add(new ProcessedMessage { MessageId = messageId, Consumer = consumer });
    await db.SaveChangesAsync(ct); // one transaction: stock and marker together
}
```

The `AnyAsync` check handles the common case. Two instances can still pass it at the same moment; the composite key makes the second `SaveChangesAsync` fail with a `DbUpdateException` whose inner error is a unique violation (SQLSTATE `23505` in PostgreSQL), which you treat as a duplicate. The key includes the consumer name because several consumers of the same published event each need their own marker. Keep markers at least as long as the broker can still redeliver, and longer if dead letters are resubmitted.

The id must be stable across redeliveries: a `MessageId` set by the producer, ideally derived from the business operation, never a delivery tag or a receive timestamp.

## Retries and poison messages

Separate failures by kind:

- **Transient**: a timeout, a deadlock, the database restarting. Retry, with a delay that grows, because an immediate retry usually hits the same problem.
- **Permanent**: invalid JSON, an unknown SKU, a bug. Retrying will fail every time. This is a **poison message**: send it to a dead-letter queue, alert, and fix it by hand.

Brokers count deliveries for you:

- **Azure Service Bus** moves a message to the queue's dead-letter subqueue (`<queue>/$deadletterqueue`) when its delivery count exceeds `MaxDeliveryCount`, 10 by default; a consumer can also call `DeadLetterMessageAsync` for a message it knows is invalid. Dead letters never expire and stay until someone receives and completes them.
- **RabbitMQ** quorum queues have a delivery limit, 20 by default since RabbitMQ 4.0. Past it, the message is dropped, or dead-lettered if the queue has a dead-letter exchange. Configure `dead-letter-exchange` and `delivery-limit` with a **policy** rather than hard-coded `x-` queue arguments, so they can change without redeploying. In 4.3 and later, `BasicRejectAsync` and a consumer crash count towards the limit; `BasicNackAsync` does not.
- **Kafka** consumers have no built-in dead-letter queue: the consumer publishes the failed record to a separate topic itself and commits the offset.

## The transactional outbox

The outbox solves the producer's dual write. Instead of publishing inside the request, save the message to an `OutboxMessages` table **in the same transaction** as the order. A background worker reads unpublished rows, publishes them and marks them as sent.

```csharp
// In the endpoint: one SaveChangesAsync, one database transaction
db.Orders.Add(order);
db.OutboxMessages.Add(new OutboxMessage
{
    Id = Guid.NewGuid(),
    Type = nameof(OrderPlaced),
    Payload = JsonSerializer.Serialize(new OrderPlaced(order.Id, order.Lines)),
    OccurredAtUtc = DateTime.UtcNow
});
await db.SaveChangesAsync(ct);

// In a BackgroundService loop, inside a new scope per batch
List<OutboxMessage> batch = await db.OutboxMessages
    .Where(m => m.PublishedAtUtc == null)
    .OrderBy(m => m.OccurredAtUtc)
    .Take(50)
    .ToListAsync(stoppingToken);

foreach (OutboxMessage message in batch)
{
    await publisher.PublishAsync(message.Type, message.Id, message.Payload, stoppingToken); // ... your broker client
    message.PublishedAtUtc = DateTime.UtcNow;
    await db.SaveChangesAsync(stoppingToken);
}
```

`SaveChangesAsync` applies all tracked changes in one transaction by default, so the order and its message are saved together or not at all. The relay can still crash after publishing and before marking the row, so the message may be published twice; that is why the outbox **requires** idempotent consumers. Use the outbox row's `Id` as the broker `MessageId`, which also lets Service Bus duplicate detection (Standard and Premium tiers, 10-minute window by default) drop resends. If several relay instances run, make sure two of them cannot take the same rows, for example with one relay instance or with row locking (`FOR UPDATE SKIP LOCKED` in PostgreSQL).

## Libraries and the MassTransit licence

Frameworks package all of this (retries, dead letters, outbox, inbox) on top of several brokers; Microsoft's idempotent consumer guidance names NServiceBus and MassTransit. MassTransit v9 is a commercial product that must be licensed (Massient, Inc.); earlier versions remain under a permissive open-source licence, and the end of v8 support could not be verified. Check the licence as you would a Magento Marketplace extension. The alternative is this lesson's toolkit: a broker client, an outbox table, an inbox table and a retry policy, which is little code for a few message types. The choice is the team's.

## In practice

- Give every message a producer-assigned id and every consumer an idempotency strategy before the first deploy.
- Configure a dead-letter destination for every queue and monitor its depth.
- Usual mistakes: publishing inside the database transaction (or after it, without an outbox), deduplicating in a cache with check-then-set races, deleting inbox markers too early, and treating broker duplicate detection as a replacement for idempotent consumers.

## Status as of 2026-11-05

- MassTransit 9.2.5 (2026-10-30) on NuGet: "MassTransit is a commercial product that must be licensed". MassTransit v8 end of support: not verified.
- RabbitMQ quorum queue delivery limit defaults to 20 since 4.0; the counting rules above are those of 4.3 and later.

## Check yourself

1. Why can the outbox relay publish the same message twice, and what makes that harmless?
2. A consumer adds the message id to a table **after** committing the stock change. Which failure does that leave open?
3. Which failures deserve a delayed retry, and which should go straight to the dead-letter queue?
4. Why does Service Bus duplicate detection not remove the need for an idempotent consumer?
