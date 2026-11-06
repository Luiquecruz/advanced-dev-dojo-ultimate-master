# Serverless Event-Driven Architecture

Many background jobs run a few hundred times a day: resize an uploaded photo, send a receipt, index a document. Keeping servers running all day for that work means paying for, patching and monitoring machines that are idle most of the time. Serverless platforms flip the model: you write a function, attach it to an event, and the provider runs it only when the event happens. This lesson builds a small event pipeline from managed pieces on AWS and shows where the model fits and where it does not.

You need: Message Queues & Event Streams (at-least-once delivery, visibility timeout, dead-letter queues), Saga Pattern & Transactional Outbox (idempotency keys and idempotent consumers) and Resilience: Circuit Breakers, Retries & Bulkheads (retries with backoff).

## The building blocks

- **Amazon S3** (object storage) stores files by key and can emit an **event notification** when an object is created or deleted. The notification goes to a function, a queue, a topic or an event bus that routes events by rules; it is not a request the uploader waits for.
- **Amazon API Gateway** is the HTTP front door: it receives requests, applies authentication and throttling, and can invoke a function for each request.
- **AWS Lambda** runs **functions**: a handler that receives one event (or a batch) and returns. You pay per invocation and for the time it runs, there is no server to manage, and the platform starts more copies when more events arrive.
- **Amazon SQS** is a managed queue. Producers send messages, consumers receive them, and a message is deleted only after it is processed, exactly as in the queues lesson.
- **Amazon DynamoDB** is a managed key-value and document database. Items are read and written by partition key (plus an optional sort key) with predictable latency at any scale, and conditional writes ("insert only if this key does not exist") are built in.
- **Amazon SES** sends email from code.

## A photo pipeline

A user uploads a photo; the system stores a thumbnail, records it and emails the user:

```text
client --(PUT)--> S3 bucket "uploads"
                     | object created event
                     v
                  SQS queue  --(after N failed receives)--> dead-letter queue
                     | Lambda polls and invokes with a batch
                     v
                  resize function --> S3 "thumbnails"
                     |            --> DynamoDB "photos" (conditional put)
                     v
                  SES email "your photo is ready"
```

Each piece does one job, and nothing runs while nobody uploads. Three design choices make it reliable.

### A queue between the event and the function

S3 can invoke a function directly, but putting **SQS in between** gives you the tools of the queues lesson. The queue **buffers** a burst of 50,000 uploads while the function works through them at its own pace. When the function fails, the message becomes visible again after the **visibility timeout** and is retried. After a set number of failed receives, the queue moves the message to a **dead-letter queue**, where it waits for a fix instead of being retried until the retention period deletes it. Lambda reads SQS through an **event source mapping**: the platform polls the queue, invokes the function with a batch and deletes the batch when the invocation succeeds. If the function throws, the whole batch becomes visible again, messages it already handled included, unless the function reports which messages failed (a partial batch response).

### Idempotent handlers

Every link in this chain delivers **at least once**. S3 notifications can be duplicated, SQS can deliver a message twice, and a function that times out after writing the thumbnail is retried and writes it again. The handler must therefore be **idempotent**: processing the same event twice leaves the same result. Use a natural idempotency key that every duplicate shares, such as the object key plus its version id; the SQS message id is not enough, because a duplicated S3 notification arrives as a new message with a new id. Record the key with a **conditional write** in DynamoDB before sending the email: if it already exists, the event was handled and the function returns without a second email. An email cannot be deduplicated downstream, so you still choose: record first and a crash before sending skips the email, or send first and a crash before recording sends it twice.

### Concurrency, timeouts and cold starts

- **Concurrency.** Each concurrent invocation runs in its own execution environment, and an account has a concurrency limit per region shared by all its functions. A burst can throttle other functions, or open thousands of connections to a database that accepts a few hundred. Reserve concurrency for critical functions and cap the ones that call fragile dependencies (for a queue trigger, with the event source mapping's maximum concurrency); the queue holds the rest.
- **Timeouts.** A function has a configured timeout with a maximum measured in minutes. Long jobs must be split into steps or moved elsewhere. Set the queue's visibility timeout above the function timeout, or a message reappears while it is still being processed; the Lambda documentation recommends several times the function timeout, so a throttled batch can still be retried.
- **Cold starts.** When no warm environment exists, the platform creates one: it loads the code, starts the runtime and runs your initialization. That adds latency to the first request, from under 100 ms to over a second depending on the runtime, the package size and the initialization code. Background work rarely notices; a user waiting on an API call does. Provisioned concurrency keeps environments warm, at the cost of paying for them while idle.

## When serverless is a poor fit

- **Steady, high load.** Paying per invocation is cheap when traffic is low or spiky. A service busy around the clock is usually cheaper on servers or containers that are always on.
- **Long-running jobs.** Video transcoding for an hour or a large batch import does not fit within a function timeout; use containers or a batch service.
- **Latency-sensitive paths.** Cold starts add tail latency, so a p99 target in the tens of milliseconds needs warm capacity or a long-running service.
- **Persistent connections and local state.** Functions are short-lived and stateless; servers that hold WebSocket connections in memory, in-memory caches and long-lived connection pools belong in long-running processes.

## Common mistakes

- **Always-on servers for low-volume background events.** A worker fleet polling for a few hundred jobs a day costs money and operations work while idle; an event-triggered function runs only when there is work.
- **Non-idempotent handlers.** Delivery is at-least-once, so a retried event sends a second email or charges twice unless the handler checks an idempotency key.
- **No dead-letter queue**, so a message that always fails is retried until it expires and hides the bug.
- **Ignoring the concurrency limit**: an unbounded burst exhausts database connections or throttles every other function in the account.

## In practice

Sketch the pipeline as events and queues first, then pick the managed piece for each box. For every function, write down its trigger, idempotency key, timeout, concurrency cap and dead-letter queue. Review the decision when traffic becomes steady and high: the same design may then be cheaper as a container service.

## Check yourself

1. Why put an SQS queue between the S3 event and the function instead of invoking the function directly?
2. A function times out after writing the thumbnail and the message is delivered again. Why is the retry safe only with an idempotent handler, and how does a conditional write in DynamoDB help?
3. Name two workloads where an always-on service fits better than functions, and explain why.
