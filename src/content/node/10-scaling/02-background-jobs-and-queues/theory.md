# Background Jobs and Queues

Some work should not happen while the user waits: sending emails, generating PDFs, resizing images, calling a slow partner API, syncing a CRM. A **background job** moves that work out of the request: the handler records "this needs doing", answers right away (often `202 Accepted`), and a **worker** does it later. The frontend analogy is optimistic UI: confirm first, finish the work behind the scenes, and report failures through another channel.

## The moving parts

```txt
HTTP handler ──add(job)──▶ queue (durable store) ──▶ workers (N at a time) ──▶ success
                                     ▲                       │
                                     └──── retry later ◀─────┤ failure
                                                             └──▶ dead-letter list after max attempts
```

| Concept | What it means | Why it matters |
| --- | --- | --- |
| Producer | code that enqueues jobs | must not lose the job if the request succeeds |
| Worker | code that processes jobs | runs in the API process or in separate worker processes |
| Concurrency | how many jobs one worker runs at once | protects databases and third-party rate limits |
| Attempts and retries | failed jobs run again, usually with exponential backoff | most failures (timeouts, 503s) are transient |
| Dead-letter queue | jobs that failed every attempt | a human or a script inspects and replays them |
| Lease / visibility timeout | a job taken by a worker is hidden for a while, then reappears if the worker died | guarantees a crashed worker does not lose the job |

## At-least-once delivery means idempotency

Durable queues guarantee that a job runs **at least once**. A worker can finish sending an email and crash before acknowledging; the lease expires and another worker sends it again. "Exactly once" is not something the queue can give you, so **handlers must be idempotent**: running them twice has the same effect as once.

```ts
async function sendInvoiceEmail({ invoiceId }: { invoiceId: string }) {
  const invoice = await invoices.find(invoiceId);
  if (invoice.emailSentAt) return;
  await mailer.send(invoice.customerEmail, renderInvoice(invoice), { idempotencyKey: `invoice-email:${invoiceId}` });
  await invoices.markEmailSent(invoiceId);
}
```

Store the outcome, check it first, and pass idempotency keys to external APIs that support them (Stripe, most email providers). Put **ids** in job payloads, not whole objects: the job then reads fresh data when it runs.

## Retries without blocking the queue

A failed job should wait before its next attempt (exponential backoff with jitter, as in the async module), but **that wait must not hold a worker slot**. If concurrency is 5 and five jobs are each sleeping 30 seconds before retrying, the whole queue stalls. Real queues re-schedule the job with a "run after" timestamp and free the slot immediately. Also decide which errors are worth retrying: a `400 Bad Request` from a partner will fail the same way every time; send it straight to the dead-letter list.

## Durable queues in practice

| Tool | Storage | Good fit |
| --- | --- | --- |
| BullMQ | Redis | the Node.js default: delays, priorities, rate limits, repeatable jobs, dashboard |
| pg-boss, Graphile Worker | PostgreSQL | you already run Postgres and want jobs in the same transaction as your data |
| Amazon SQS, Google Cloud Tasks | managed | serverless and cloud-native setups |
| RabbitMQ | broker | routing between many services |
| Temporal, Inngest, Trigger.dev | workflow engines | long multi-step workflows with state, timers and compensation |
| Kafka | log | event streaming to many consumers, not a task queue |

**The dual-write problem.** "Insert the order, then enqueue the email" can fail between the two steps: the order exists and the email never goes out (or the reverse). Postgres-based queues let you enqueue in the same transaction; otherwise use the **transactional outbox**: write the job into an `outbox` table in the same transaction and let a relay publish it.

## An in-memory queue is a sketch

The challenge builds an in-memory queue to make the mechanics visible: concurrency slots, attempts, delayed retries, a dead-letter list and "wait until idle". In production an in-memory queue loses every pending job on deploy or crash and cannot be shared between instances. It is acceptable only for work that may be lost (warming a cache, batching analytics).

## When to choose it

Use a background job when the work is slow (over a few hundred milliseconds), unreliable (external APIs), retryable, bursty, or not needed for the response. Keep work in the request when the user needs the result to continue (a payment authorization) or when it is fast and local. Pick the queue by your stack: BullMQ when you have Redis, pg-boss or Graphile Worker when Postgres is your only store, a managed queue on serverless platforms, and a workflow engine when jobs become multi-step processes with waits and compensations.

## Working with AI

Brief the assistant with the delivery guarantee ("at-least-once, jobs may run twice"), the retry policy, concurrency limits and what happens to permanent failures. Review generated code for:

- Handlers that are not idempotent (charging, emailing, incrementing without a guard).
- Whole entities in the payload instead of ids.
- Retries that sleep inside the worker slot, or retry every error including validation errors.
- No maximum attempts and no dead-letter handling or alerting.
- Enqueue outside the database transaction with no outbox.
- Jobs kept in memory for work users depend on.
