# Reliable Messaging: Idempotency, Retries, Dead Letters and the Outbox

After this lesson you can design for at-least-once delivery: a consumer that absorbs duplicates, retries that separate transient from permanent failures, a dead-letter path for poison messages, and a transactional outbox so that a saved order always produces its message. You also know where MassTransit stands after its licence change.

You need: 10/03 (brokers and acknowledgements), 10/01 (`BackgroundService`), 07/02 (`SaveChangesAsync`), 07/06 (transactions and unique constraints) and 04/01 (exceptions).

## The dual write

A typical flow saves the order and then publishes `OrderPlaced` to the broker. Two writes, two systems, no shared transaction. If the broker is down after the save, the order exists and nobody is told. If the publish happens inside a transaction that later rolls back, consumers act on an order that does not exist. And a consumer that crashes before acknowledging gets the message again.

Broker features reduce duplicates and loss, but they cannot make your database write and your message happen together. You design for that with the patterns below.

## Delivery guarantees

- **At-most-once**: acknowledge before processing (RabbitMQ `autoAck`, Service Bus receive-and-delete). A crash loses the message.
- **At-least-once**: acknowledge after processing. A crash between the work and the acknowledgement redelivers the message.
- **Effectively-once**: at-least-once delivery plus a consumer that ignores duplicates. Exactly-once delivery across a broker and your database is impractical; this is the goal instead.

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

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:48dcb41c7b0b26fa2845c90997a3a037f8a36d90cf040b427778c757bfdfe6d8 -->

The `AnyAsync` check handles most duplicates. Concurrent consumers can both pass it; the composite key makes the second `SaveChangesAsync` fail with a unique-violation `DbUpdateException` (PostgreSQL SQLSTATE `23505`), treated as a duplicate. Consumer names give each consumer its own marker. Retain markers through broker redelivery and supported operator-initiated dead-letter replay windows. For replay after expiry, enforce a durable business idempotency key in the side-effect transaction to prevent reapplication.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

The id must be stable across redeliveries: a `MessageId` set by the producer, ideally derived from the business operation, never a delivery tag, a delivery count or a receive timestamp.

## Retries and poison messages

Separate failures by kind:

- **Transient**: a timeout, a deadlock, the database restarting. Retry, with a delay that grows (1 s, 2 s, 4 s: **exponential backoff**), because an immediate retry usually hits the same problem.
- **Permanent**: invalid JSON, an unknown SKU, a bug. Retrying will fail every time. This is a **poison message**: send it to a dead-letter queue at once, alert, and fix it by hand.

A consumer can retry a few times in process before it dead-letters the message. The broker counts deliveries too, as an outer loop:

- **Azure Service Bus** moves a message to the queue's dead-letter subqueue (`<queue>/$deadletterqueue`) when its delivery count exceeds `MaxDeliveryCount`, 10 by default; a consumer can also call `DeadLetterMessageAsync` itself.
- **RabbitMQ** quorum queues have a delivery limit, 20 by default since RabbitMQ 4.0. Past it, the message is dropped, or dead-lettered if the queue has a dead-letter exchange. Set `dead-letter-exchange` and `delivery-limit` with a **policy**, not hard-coded queue arguments. In 4.3 and later, `BasicRejectAsync` and a consumer crash count towards the limit; `BasicNackAsync` does not.
- **Kafka** has no built-in dead-letter queue: the consumer publishes the failed record to a separate topic and commits the offset.

## The transactional outbox

The outbox solves the producer's dual write: save the message to an `OutboxMessages` table **in the same transaction** as the order, and let a background worker publish unpublished rows and mark them as sent.

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

`SaveChangesAsync` applies all tracked changes in one transaction by default, so the order and its message are saved together or not at all. The relay can still crash after publishing and before marking the row, so the message may be published twice; that is why the outbox **requires** idempotent consumers. Use the outbox row's `Id` as the broker `MessageId`, so Service Bus duplicate detection (10-minute window by default) can also drop resends. Several relay instances must not take the same rows: use row locking (`FOR UPDATE SKIP LOCKED` in PostgreSQL).

## Libraries and the MassTransit licence

Frameworks package retries, dead letters, outbox and inbox on top of several brokers; Microsoft's idempotent consumer guidance names NServiceBus and MassTransit. MassTransit v9 is a commercial product that must be licensed (Massient, Inc.); earlier versions remain open source. The alternative is this lesson's toolkit, which is little code for a few message types. The choice is the team's.

## Common mistakes

- **Marking the message processed before the work succeeds.** A failure after the marker turns the redelivery into a "duplicate", and the order is silently dropped. Write the marker in the same transaction as the side effect.
- **Publishing right after `SaveChangesAsync`, without an outbox.** A broker outage in between leaves saved orders nobody hears about. Save the message with the order.
- **Retrying poison messages.** Invalid data fails on every attempt, so retries only delay the dead letter. Dead-letter permanent failures at once.
- **Deduplicating in a cache with check-then-set.** Two instances both see "not processed" and both do the work. Let a unique key in the database decide.

## In practice

- Give every message a producer-assigned id and every consumer an idempotency strategy before the first deploy.
- Configure a dead-letter destination for every queue and monitor its depth.

## Status as of 2026-11-05

- MassTransit 9.2.5 (2026-10-30) on NuGet: "MassTransit is a commercial product that must be licensed". MassTransit v8 end of support: not verified.
- RabbitMQ quorum queue delivery limit defaults to 20 since 4.0; the counting rules above are those of 4.3 and later.

## Check yourself

1. Why can the outbox relay publish the same message twice, and what makes that harmless?
2. A consumer adds the message id to a table **after** committing the stock change. Which failure does that leave open?
3. Which failures deserve a delayed retry, and which should go straight to the dead-letter queue?
4. Why does Service Bus duplicate detection not remove the need for an idempotent consumer?
